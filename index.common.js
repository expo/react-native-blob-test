import React, { Component } from 'react';
import {
  AppRegistry,
  BlobManager,
  ScrollView,
  View,
  Text,
  CameraRoll,
  StatusBar,
  RefreshControl,
  Platform,
  StyleSheet,
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
    this._test('Receives data from socket', t => {
      const ws = new WebSocket('ws://localhost:7232');

      ws.binaryType = 'blob';
      ws.onerror = t.fail;
      ws.onmessage = e => {
        t.true(e.data instanceof Blob);

        if (e.data) {
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
        t.true(req.response instanceof Blob);
      };
      req.onerror = t.fail;
      req.send();
    });

    this._test('Downloads blob via fetch', async t => {
      const response = await fetch(url);
      const blob = await response.blob();

      t.true(blob instanceof Blob);
    });

    this._test('Creates blob from URI', async t => {
      const { edges } = await CameraRoll.getPhotos({ first: 1 });
      const blob = await BlobManager.createFromURI(edges[0].node.image.uri, {
        type: 'image/png',
      });

      t.true(blob instanceof Blob);
    });

    this._test('Uploads blob to Firebase', async t => {
      const { edges } = await CameraRoll.getPhotos({ first: 1 });
      const blob = await BlobManager.createFromURI(edges[0].node.image.uri, {
        type: 'image/png',
      });
      const ref = firebase.storage().ref().child(uuid.v4());

      const task = ref.put(blob);

      task.on(
        'state_changed',
        snapshot =>
          (t.progress = snapshot.bytesTransferred / snapshot.totalBytes * 100),
        t.fail,
        t.pass
      );
    });
  };

  _test = async (name: string, callback) => {
    const id = uuid.v4();

    this.setState(state => ({
      tests: state.tests.concat({
        id,
        name,
        status: 'running',
      }),
    }));

    const update = data =>
      this.setState(state => ({
        tests: state.tests.map(test => {
          if (test.id === id) {
            return { ...test, ...data };
          }
          return test;
        }),
      }));

    const t = {
      pass() {
        update({ status: 'passed' });
      },
      fail(error: string | Error) {
        update({
          status: 'failed',
          message: typeof error === 'string'
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
          t.fail(`Received: ${actual}, Expected: ${expected}`);
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

  _handleRefresh = () => {
    this.setState({ refreshing: true, tests: [] });
    this._run();

    setTimeout(() => this.setState({ refreshing: false }), 500);
  };

  render() {
    return (
      <View style={styles.container}>
        {Platform.OS === 'android' &&
          <StatusBar translucent backgroundColor="rgba(0, 0, 0, 0.16)" />}
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this._handleRefresh}
            />
          }
          contentContainerStyle={styles.content}
        >
          {this.state.tests.map(test =>
            <View key={test.id} style={styles.test}>
              <Text style={styles.emoji}>
                {test.status === 'failed'
                  ? '😥'
                  : test.status === 'passed' ? '😃' : '🤔'}
              </Text>
              <View>
                <Text style={styles.name}>
                  {test.name}
                </Text>
                <Text style={[styles.status, styles[test.status]]}>
                  {test.status === 'failed'
                    ? `Failed ${test.message ? ` - ${test.message}` : ''}`
                    : test.status === 'passed'
                      ? 'Passed'
                      : `Running ${test.progress ? `(${test.progress})` : ''}`}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212733',
    paddingTop: StatusBar.currentHeight,
  },
  content: {
    padding: 4,
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
    marginRight: 8,
    fontSize: 24,
    color: '#fff',
    width: 32,
  },
  name: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#fff',
  },
  status: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  running: {
    color: '#FECB66',
  },
  passed: {
    color: '#BAE664',
  },
  failed: {
    fontWeight: 'bold',
    color: '#E22933',
  },
});

AppRegistry.registerComponent('BlobTest', () => BlobTest);
