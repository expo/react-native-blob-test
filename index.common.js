import React, { Component } from 'react';
import {
  AppRegistry,
  CameraRoll,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as firebase from 'firebase';
import uuid from 'uuid';

const url =
  'https://firebasestorage.googleapis.com/v0/b/blobtest-36ff6.appspot.com/o/Obsidian.jar?alt=media&token=93154b97-8bd9-46e3-a51f-67be47a4628a';

const firebaseConfig = {
  apiKey: 'AIzaSyAlZruO2T_JNOWn4ysfX6AryR6Dzm_VVaA',
  authDomain: 'blobtest-36ff6.firebaseapp.com',
  databaseURL: 'https://blobtest-36ff6.firebaseio.com',
  storageBucket: 'blobtest-36ff6.appspot.com',
  messagingSenderId: '506017999540',
};

firebase.initializeApp(firebaseConfig);

type State = {
  tests: Array<{
    id: string,
    name: string,
    progress?: number,
    message?: string,
    status: 'running' | 'passed' | 'failed',
    retry: Function,
  }>,
};

class BlobTest extends Component {
  state = {
    refreshing: false,
    tests: [],
  };

  componentDidMount() {
    this._run();
  }

  _run = () => {
    this._test('Send & receives data via socket', t => {
      let count = 0;

      const ws = new WebSocket('ws://localhost:7232');

      ws.binaryType = 'blob';
      ws.onerror = t.fail;
      ws.onmessage = e => {
        if (e.data === 'DONE' && count === 1) {
          t.pass();
          return;
        }

        if (this._isBlob(e.data)) {
          count++;
          ws.send(e.data);
        }
      };
    });

    this._test('Downloads blob via XMLHttpRequest', t => {
      const req = new XMLHttpRequest();
      req.open('GET', url, true);
      req.responseType = 'blob';
      req.onprogress = e => (t.progress = e.loaded);
      req.onload = () => {
        t.true(this._isBlob(req.response));
      };
      req.onerror = t.fail;
      req.send();
    });

    this._test('Creates blob from URI via XMLHttpRequest', async t => {
      const { edges } = await CameraRoll.getPhotos({ first: 1 });
      const req = new XMLHttpRequest();
      req.open('GET', edges[0].node.image.uri, true);
      req.responseType = 'blob';
      req.onprogress = e => (t.progress = e.loaded);
      req.onload = () => {
        t.true(this._isBlob(req.response));
      };
      req.onerror = t.fail;
      req.send();
    });

    this._test('Uploads blob via XMLHttpRequest', async t => {
      const { edges } = await CameraRoll.getPhotos({ first: 1 });
      const response = await fetch(edges[0].node.image.uri);
      const blob = await response.blob();
      const req = new XMLHttpRequest();
      req.open('POST', `http://localhost:7232/upload?size=${blob.size}`, true);
      req.onprogress = e => (t.progress = e.loaded);
      req.onload = () => {
        t.is(req.response, 'DONE');
      };
      req.onerror = t.fail;
      req.send(blob);
    });

    this._test('Downloads blob via fetch', async t => {
      const response = await fetch(url);
      const blob = await response.blob();

      t.true(this._isBlob(blob));
    });

    this._test('Creates blob from URI via fetch', async t => {
      const { edges } = await CameraRoll.getPhotos({ first: 1 });
      const response = await fetch(edges[0].node.image.uri);
      const blob = await response.blob();

      t.true(this._isBlob(blob));
    });

    this._test('Uploads blob via fetch', async t => {
      const { edges } = await CameraRoll.getPhotos({ first: 1 });
      const response = await fetch(edges[0].node.image.uri);
      const blob = await response.blob();
      const response1 = await fetch(
        `http://localhost:7232/upload?size=${blob.size}`,
        { method: 'POST', body: blob }
      );

      t.is(await response1.text(), 'DONE');
    });

    this._test('Uploads blob to Firebase', async t => {
      const { edges } = await CameraRoll.getPhotos({ first: 1 });
      const response = await fetch(edges[0].node.image.uri);
      const blob = await response.blob();
      const ref = firebase
        .storage()
        .ref()
        .child(uuid.v4());

      const task = ref.put(blob);

      task.on(
        'state_changed',
        snapshot =>
          (t.progress = snapshot.bytesTransferred / snapshot.totalBytes * 100),
        t.fail,
        t.pass
      );
    });

    this._test('Reads blob as text', t => {
      const reader = new FileReader();
      reader.onload = e => {
        t.is(e.target.result, 'Hello world');
      };
      reader.onerror = t.fail;
      reader.readAsText(new Blob(['Hello world']));
    });

    this._test('Reads blob as data URL', t => {
      const reader = new FileReader();
      reader.onload = e => {
        t.is(e.target.result, 'data:application/octet-stream;base64,VGVzdA==');
      };
      reader.onerror = t.fail;
      reader.readAsDataURL(new Blob(['Test']));
    });
  };

  _create = async (id: string, callback) => {
    let done = false;

    const update = data => {
      if (done) {
        throw new Error('Trying to update completed test: ' + name);
      }

      this.setState(state => ({
        tests: state.tests.map(test => {
          if (test.id === id) {
            return { ...test, ...data };
          }
          return test;
        }),
      }));

      done = data.status === 'passed' || data.status === 'failed';
    };

    const t = {
      pass() {
        update({ status: 'passed' });
      },
      fail(error: string | Error) {
        update({
          status: 'failed',
          message:
            typeof error === 'string'
              ? error
              : error instanceof Error || error.message
                ? error.message
                : undefined,
        });
      },
      is(value, expected) {
        if (value === expected) {
          t.pass();
        } else {
          t.fail(`Received: ${value}, Expected: ${expected}`);
        }
      },
      true(value) {
        t.is(value, true);
      },
      false(value) {
        t.is(value, false);
      },
      set progress(value: number) {
        update({ progress: value });
      },
    };

    try {
      await callback(t);
    } catch (e) {
      t.fail(e);
    }
  };

  _test = async (name: string, callback) => {
    const id = uuid.v4();

    this.setState(
      state => ({
        tests: state.tests.concat({
          id,
          name,
          status: 'running',
          retry: () => {
            this.setState(
              state => ({
                tests: state.tests.map(
                  test =>
                    test.id === id
                      ? {
                          id,
                          name,
                          status: 'running',
                          retry: test.retry,
                        }
                      : test
                ),
              }),
              () => this._create(id, callback)
            );
          },
        }),
      }),
      () => this._create(id, callback)
    );
  };

  _isBlob = blob => {
    if (!blob instanceof Blob)
      throw new Error(
        'Object is not an instance of Blob ' + JSON.stringify(blob)
      );

    const { size, type } = blob;
    const { blobId, name } = blob.data;

    if (typeof blobId !== 'string')
      throw new Error("Blob doesn't have a valid id " + blobId);
    if (typeof name !== 'undefined' && typeof name !== 'string')
      throw new Error("Blob doesn't have a valid name " + name);
    if (typeof size !== 'number' && size <= 0)
      throw new Error("Blob doesn't have a valid size " + size);
    if (typeof type !== 'string')
      throw new Error("Blob doesn't have a valid type " + type);

    return true;
  };

  _handleRefresh = () => {
    this.setState({ refreshing: true });

    this.state.tests.forEach(t => t.retry());

    setTimeout(() => this.setState({ refreshing: false }), 200);
  };

  render() {
    return (
      <View style={styles.container}>
        <StatusBar
          translucent
          barStyle="light-content"
          backgroundColor={
            Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.16)' : 'transparent'
          }
        />
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this._handleRefresh}
            />
          }
          contentContainerStyle={styles.content}
        >
          {this.state.tests.map(test => (
            <TouchableOpacity key={test.id} onPress={test.retry}>
              <View style={styles.test}>
                <Text style={styles.emoji}>
                  {test.status === 'failed'
                    ? '😥'
                    : test.status === 'passed' ? '😃' : '🤔'}
                </Text>
                <View style={styles.details}>
                  <Text style={[styles.text, styles.name]}>{test.name}</Text>
                  <Text
                    style={[styles.text, styles.status, styles[test.status]]}
                  >
                    {test.status === 'failed'
                      ? `Failed ${test.message ? `- ${test.message}` : ''}`
                      : test.status === 'passed'
                        ? 'Passed'
                        : `Running ${
                            test.progress ? `(${test.progress})` : ''
                          }`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212733',
  },
  content: {
    padding: 4,
    paddingTop: Platform.OS === 'ios' ? 26 : StatusBar.currentHeight + 4,
  },
  test: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 4,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, .05)',
    borderRadius: 3,
  },
  emoji: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: Platform.OS === 'ios' ? 32 : 44,
    padding: 8,
    fontSize: 24,
    color: '#fff',
  },
  details: {
    marginLeft: Platform.OS === 'ios' ? 32 : 44,
  },
  text: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: Platform.OS === 'ios' ? 'bold' : 'normal',
  },
  name: {
    color: '#fff',
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
  },
  running: {
    color: '#FECB66',
  },
  passed: {
    color: '#BAE664',
  },
  failed: {
    color: '#E22933',
  },
});

AppRegistry.registerComponent('BlobTest', () => BlobTest);
