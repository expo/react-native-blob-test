import React, { Component } from 'react';
import {
  AppRegistry,
  BlobManager,
  ScrollView,
  Button,
  View,
  Image,
  Text,
  StyleSheet,
} from 'react-native';
import * as firebase from 'firebase';

global.BlobManager = BlobManager;

const uri = 'file:///storage/emulated/0/Download/69555877.jpg';
const url = 'https://firebasestorage.googleapis.com/v0/b/blobtest-36ff6.appspot.com/o/Obsidian.jar?alt=media&token=93154b97-8bd9-46e3-a51f-67be47a4628a';

const firebaseConfig = {
  apiKey: 'AIzaSyAlZruO2T_JNOWn4ysfX6AryR6Dzm_VVaA',
  authDomain: 'blobtest-36ff6.firebaseapp.com',
  databaseURL: 'https://blobtest-36ff6.firebaseio.com',
  storageBucket: 'blobtest-36ff6.appspot.com',
  messagingSenderId: '506017999540',
};

firebase.initializeApp(firebaseConfig);

const socket = new WebSocket('ws://localhost:7273');

socket.onopen = async () => {
  console.log('Socket connected');
  const file = await BlobManager.createFromURI(uri, { type: 'image/png' });
  socket.send(file);
};

class FirebaseReactNativeSample extends Component {

  state = {
    blob: null,
    logs: [],
  };

  _xhrDownload = async () => {
    const req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'blob';
    req.onprogress = e => {
      this._log('Progress:', e.loaded);
    };
    req.onload = () => {
      this._log('Download success:', req.response);
    };
    req.onerror = () => {
      this._log('Download error:', req.response);
    };
    this._log('Downloading:', url);
    req.send();
  }

  _fetchDownload = async () => {
    this._log('Downloading:', url);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      this._log('Download success:', blob);
    } catch (e) {
      this._log('Download error:', e.message);
    }
  }

  _uploadToFirebase = async () => {
    this._log('Uploading to firebase:', this.state.blob);
    const ref = firebase.storage().ref().child('pokemon.jpg');
    const snapshot = await ref.put(this.state.blob);
    this._log('Uploaded successful:', snapshot.downloadURL);
  }

  _createBlob = async () => {
    this._log('Creating Blob from:', uri);
    const blob = await BlobManager.createFromURI(uri, { type: 'image/png' });
    this._log('File created:', blob);
    this.setState({
      blob,
    });
  };

  _log = (message, data) => {
    console.log(message, data);
    this.setState(state => ({
      logs: state.logs.concat({
        message,
        data,
        error: data && data instanceof Error,
      }),
    }));
  };

  _renderButton = (label, onPress) => (
    <View style={styles.button}>
      <Button
        onPress={async () => {
          try {
            await onPress();
          } catch (e) {
            this._log('Error', e);
          }
        }}
        title={label}
      />
    </View>
  );

  render() {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.console}>
          {this.state.logs.map((item, i) => {
            const data = typeof item.data !== 'undefined' ? ' ' + JSON.stringify(item.data) : '';
            return (
              <Text key={i} style={styles.log}>
                {item.message}
                {data ? <Text style={[ styles.data, item.error && styles.error ]}>{data}</Text> : null}
              </Text>
            );
          })}
        </ScrollView>
        {this.state.blob ? <Image style={styles.image} source={{ uri: URL.createObjectURL(this.state.blob) }} /> : null}
        {this._renderButton('Create blob from URI', this._createBlob)}
        {this._renderButton('Download binary (XMLHttpRequest)', this._xhrDownload)}
        {this._renderButton('Download binary (Fetch)', this._fetchDownload)}
        {this._renderButton('Upload to firebase', this._uploadToFirebase)}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },

  console: {
    padding: 12,
    transform: [ { scaleY: -1 } ],
  },

  image: {
    height: 100,
    width: 100,
  },

  scroll: {
    flex: 1,
    backgroundColor: '#212733',
    margin: 8,
    transform: [ { scaleY: -1 } ],
  },

  log: {
    fontFamily: 'monospace',
    color: '#fff',
    margin: 4,
  },

  button: {
    margin: 8,
  },

  data: {
    color: '#00BCD4',
  },

  error: {
    color: '#FF9800',
  },
});

AppRegistry.registerComponent('BlobTest', () => FirebaseReactNativeSample);

