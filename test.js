Blob.fromURI('file:///sdcard/Snapseed/IMG_20161104_091644784-01.jpeg', { type: 'image/jpeg' }).then(blob => {
  const req = new XMLHttpRequest();

  req.open('POST', 'https://firebasestorage.googleapis.com/v0/b/blobtest-36ff6.appspot.com/o?name=image.jpg&upload_id=AEnB2Ur1fOx5qN4sl-UlynIQCyvqAIrlnn6RfwjLJ2FQQJTqLmLnz0bKpxVN320WG7W3bVBJbOIhbvJg1THtrDOMOTZOmd1Thy4MeKZzK2xIcOiXmqeUyTQ&upload_protocol=resumable', true);
  req.onload = console.log;
  req.onerror = console.error;

  req.send(blob);
});
