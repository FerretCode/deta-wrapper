const { MongoClient, ServerApiVersion } = require("mongodb");

/**
 * @param {string} connectionUri - The connection URI for MongoDB.
 * @param {string} db - The name of the MongoDB database to connect to
 * @returns {Deta} - An instance of the Deta class.
 */
module.exports.Deta = function (connectionUri, db) {
  return new Deta(connectionUri, db);
};

class Deta {
  /**
   * @param {string} connectionUri - The connection URI for MongoDB.
   */
  constructor(connectionUri, db) {
    this.connectionUri = connectionUri;

    const client = new MongoClient(this.connectionUri, {
      minPoolSize: 1,
      maxPoolSize: 50,
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    /**
     * @param {string} collection - The collection name.
     * @returns {Base} - An instance of the Base class.
     */
    this.Base = (collection) => {
      return new Base(collection, client, db);
    };
  }
}

class Base {
  /**
   * @param {string} collection - The collection name.
   * @param {MongoClient} client - The MongoClient instance.
   */
  constructor(collection, client, db) {
    this.collection = collection;
    this.connected = false;

    if (db) this.db = db;
    else this.db = "deta";

    this._inactiveTime = 0;

    this._createInactiveCounter = function () {
      return setInterval(() => {
        if (this._inactiveTime >= 30) {
          client.close();

          clearInterval(this._inactiveCounter);

          return;
        }

        this._inactiveTime++;
      }, 1000);
    };

    this._resetInactiveCounter = function () {
      if (this._inactiveCounter) {
        clearInterval(this._inactiveCounter);
      }

      client.connect();

      this._inactiveTime = 0;
      this._inactiveCounter = this._createInactiveCounter();
    };

    this._inactiveCounter = this._createInactiveCounter();

    /**
     * Puts an item into the collection.
     * @param {object} item - The item to put into the collection.
     * @param {string} key - The key to the item
     * @returns {Promise} - A promise that resolves with the document when the operation is complete.
     */
    this.put = (item, key) =>
      new Promise(async (resolve, reject) => {
        try {
          this._resetInactiveCounter();

          const db = client.db(this.db);
          const coll = db.collection(this.collection);

          item.key = key;

          const document = await coll.insertOne(item);

          resolve(document);
        } catch (err) {
          reject(err);
        }
      });

    /**
     * Retrieves an item from the collection.
     * @param {string} key - The key of the item to retrieve.
     * @returns {Promise} - A promise that resolves with the retrieved item.
     */
    this.get = (key) =>
      new Promise(async (resolve, reject) => {
        try {
          this._resetInactiveCounter();

          const db = client.db(this.db);
          const coll = db.collection(this.collection);

          const item = await coll.findOne({ key });

          resolve(item);
        } catch (err) {
          reject(err);
        }
      });

    /**
     * Updates an item in the collection.
     * @param {string} key - The key of the item to update.
     * @param {object} updates - The updates to apply to the item.
     * @returns {Promise} - A promise that resolves when the operation is complete.
     */
    this.update = (updates, key) =>
      new Promise(async (resolve, reject) => {
        try {
          this._resetInactiveCounter();

          const db = client.db(this.db);
          const coll = db.collection(this.collection);

          const document = await coll.updateOne({ key }, { $set: updates });

          resolve(document);
        } catch (err) {
          reject(err);
        }
      });

    /**
     * Deletes an item from the collection.
     * @param {string} key - The key of the item to delete.
     * @returns {Promise} - A promise that resolves when the operation is complete.
     */
    this.delete = (key) =>
      new Promise(async (resolve, reject) => {
        try {
          this._resetInactiveCounter();

          const db = client.db(this.db);
          const coll = db.collection(this.collection);

          const document = await coll.deleteOne({ key });

          resolve(document);
        } catch (err) {
          reject(err);
        }
      });

    /**
     * Fetches all items from the collection.
     * @param {object} query - The query to use when fetching items.
     * @returns {Promise} - A promise that resolves with an array of items.
     */
    this.fetch = (query) =>
      new Promise(async (resolve, reject) => {
        try {
          this._resetInactiveCounter();

          const db = client.db(this.db);
          const coll = db.collection(this.collection);

          const fetchOptions = {};

          const specialQueries = [
            "?ne",
            "?lt",
            "?lte",
            "?gt",
            "?gte",
            "?pfx",
            "?r",
            "?contains",
            "?not_contains",
          ];

          for (const key in query) {
            if (!specialQueries.includes(key.slice(key.indexOf("?")))) {
              fetchOptions[key] = query[key];

              continue;
            }

            const specialQuery = key.slice(key.indexOf("?"));
            const normalQuery = key.slice(0, key.indexOf("?"));

            switch (specialQuery) {
              case "?ne":
                fetchOptions[normalQuery] = { $not: { $eq: query[key] } };
                break;
              case "?lt":
                fetchOptions[normalQuery] = { $lt: query[key] };
                break;
              case "?lte":
                fetchOptions[normalQuery] = { $lte: query[key] };
                break;
              case "?gt":
                fetchOptions[normalQuery] = { $gt: query[key] };
                break;
              case "?gte":
                fetchOptions[normalQuery] = { $gte: query[key] };
                break;
              case "?pfx":
                fetchOptions[normalQuery] = { $regex: `^${query[key]}` };
                break;
              case "?r":
                fetchOptions[normalQuery] = { $regex: query[key] };
                break;
              case "?contains":
                fetchOptions[normalQuery] = { $regex: query[key] };
                break;
              case "?not_contains":
                fetchOptions[normalQuery] = { $not: { $regex: query[key] } };
                break;
            }
          }

          console.log(fetchOptions);

          const results = coll.find(fetchOptions);

          const arr = await results.toArray();

          resolve(arr);
        } catch (err) {
          reject(err);
        }
      });
  }
}
