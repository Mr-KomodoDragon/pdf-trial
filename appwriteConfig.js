// // appwriteConfig.js
// // This file will configure the Appwrite client

// // 1. Destructure the Client and ID classes from the global 'Appwrite' object
// const { Client, ID, Storage } = Appwrite;

// // 2. Initialize the Appwrite Client
// const client = new Client();

// // 3. Set your Appwrite project configuration
// // You can find this in your Appwrite console in the project settings
// client
//     .setEndpoint('https://syd.cloud.appwrite.io/v1')
//     .setProject('68cbce490037c7926659')
//     .setKey('standard_15ad54ac81529df9847b63e88b0ac43908c6ef6f8c30f94012ddf92855aae21322344c5c7a847d9dc87aeb9388f530950f3ef03f2c76e53eb99699d06ce949cd32354d907ed7dbd5f74289539d02bf62287467df585674196ac202c790d6b05c9574368b41104f381d1aaecce279a6c16b9cd73dfce671f3e9b9f68049b2ff80')
// // 4. Initialize the Appwrite Storage service
// const storage = new Storage(client);

// // 5. Export the necessary modules for use in other files
// export { client, ID, storage };

// appwriteConfig.js
import { Client, Storage, ID } from 'https://cdn.skypack.dev/appwrite';

const client = new Client()
  .setEndpoint("https://syd.cloud.appwrite.io/v1")
  .setProject("68cbce490037c7926659")
  .setKey('standard_15ad54ac81529df9847b63e88b0ac43908c6ef6f8c30f94012ddf92855aae21322344c5c7a847d9dc87aeb9388f530950f3ef03f2c76e53eb99699d06ce949cd32354d907ed7dbd5f74289539d02bf62287467df585674196ac202c790d6b05c9574368b41104f381d1aaecce279a6c16b9cd73dfce671f3e9b9f68049b2ff80');
const storage = new Storage(client);

export { client, storage, ID };

