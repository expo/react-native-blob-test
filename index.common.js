import { Component } from 'react';
import {
  AppRegistry,
} from 'react-native';
import * as firebase from 'firebase';

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
    file: null,
  };

  componentDidMount() {
    this._create();
  }

  _create = async () => {
    const file = await File.fromURI('file:///storage/emulated/0/Download/content.png', { type: 'image/png' });
    this.setState({
      file,
    });
  }

  _xhrDownload = async () => {
    const req = new XMLHttpRequest();
    req.open('GET', 'https://firebasestorage.googleapis.com/v0/b/blobtest-36ff6.appspot.com/o/psyduck.jpg?alt=media&token=9fde6e14-c5d1-4db8-aafc-4228b842f367', true);
    req.responseType = 'blob';
    req.onload = () => {
      console.log('File downloaded', req.response);
    };
    req.onerror = console.error;
    req.send();
  }

  _firebaseUpload = async () => {
    const ref = firebase.storage().ref().child('pokemon.jpg');
    const snapshot = await ref.put(this.state.file);
    console.log('Uploaded a file!', snapshot);
  }

  render() {
    return null;
  }
}

AppRegistry.registerComponent('BlobTest', () => FirebaseReactNativeSample);

