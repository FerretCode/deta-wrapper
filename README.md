# deta-wrapper

A (mostly) drop-in replacement for the https://deta.space SDK to use MongoDB

Deta introduced a new usage limit for their API without an announcement or update. Anyone looking to migrate off of Deta can use this library.

# migration process

- create a new MongoDB instance and create the `deta` database
- export your data from your base & import the JSON documents into MongoDB (you can do this manually through the MongoDBCompass app)
- change the imports to use deta-wrapper rather than deta
- pass a connection string rather than project key to the `Deta` function
- remove all fetch calls which use the last key. The wrapper will automatically fetch all records rather than paginating
