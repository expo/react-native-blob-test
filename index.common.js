import React, { Component } from 'react';
import {
  AppRegistry,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as firebase from 'firebase';

const uri = 'file:///storage/emulated/0/Download/content.png';

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
  const file = await File.fromURI('file:///storage/emulated/0/Download/content.png', { type: 'image/png' });
  socket.send(file);
};

class FirebaseReactNativeSample extends Component {

  state = {
    blob: null,
    logs: [],
  };

  _xhrDownload = async () => {
    const url = 'https://firebasestorage.googleapis.com/v0/b/blobtest-36ff6.appspot.com/o/psyduck.jpg?alt=media&token=9fde6e14-c5d1-4db8-aafc-4228b842f367';
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

  _uploadToFirebase = async () => {
    this._log('Uploading to firebase:', this.state.blob);
    const ref = firebase.storage().ref().child('pokemon.jpg');
    const snapshot = await ref.put(this.state.blob);
    this._log('Uploaded successful:', snapshot.downloadURL);
  }

  _createBlob = async () => {
    this._log('Creating Blob from:', uri);
    const blob = await Blob.fromURI(uri, { type: 'image/png' });
    this._log('File created:', blob);
    this.setState({
      blob,
    });
  };

  _createFile = async () => {
    this._log('Creating File from:', uri);
    const file = await File.fromURI(uri, { type: 'image/png' });
    this._log('File created:', file);
    this.setState({
      blob: file,
    });
  };

  _log = (message, data) => {
    console.log(message, data);
    this.setState(state => ({
      logs: state.logs.concat({
        message,
        data,
      }),
    }));
  };

  _renderButton = (label, onPress) => (
    <TouchableOpacity
      onPress={async () => {
        try {
          await onPress();
        } catch (e) {
          this._log('Error', e);
        }
      }}
    >
      <Text style={styles.button}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  render() {
    return (
      <View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.console}>
          {this.state.logs.map((item, i) => {
            const data = typeof item.data !== 'undefined' ? ' ' + JSON.stringify(item.data) : '';
            return (
              <Text key={i} style={styles.log}>
                {item.message}
                {data ? <Text style={styles.data}>{data}</Text> : null}
              </Text>
            );
          })}
        </ScrollView>
        {this._renderButton('Create blob from URI', this._createBlob)}
        {this._renderButton('Create file from URI', this._createFile)}
        {this._renderButton('Download binary file', this._xhrDownload)}
        {this._renderButton('Upload to firebase', this._uploadToFirebase)}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  console: {
    padding: 12,
    transform: [ { scaleY: -1 } ],
  },

  scroll: {
    backgroundColor: '#212733',
    margin: 16,
    height: 320,
    transform: [ { scaleY: -1 } ],
  },

  log: {
    fontFamily: 'monospace',
    color: '#fff',
    margin: 4,
  },

  button: {
    margin: 8,
    fontSize: 16,
    textAlign: 'center',
    color: '#2196F3',
  },

  data: {
    color: '#00BCD4',
  },
});

AppRegistry.registerComponent('BlobTest', () => FirebaseReactNativeSample);

