# Stories-Server

This is the server side of the project. 
The server serves get/post requests sent from the app/browser.

Once a clean server is was deployed, it can start serve it's app.

For the app see [Stories-Client](https://github.com/eviabs/Stories-Client)

## Getting Started

The server is a node.js app that interacts with access db.
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Installing And Deployment

* Install [Node.js](https://nodejs.org/en/download/current/)

* Copy the server's content into a new directory (this includes all of the needed modules and server's files).

* Rename the file *db/empty_db.accdb* to *db/db.accdb*.

* Run the *index.js* file

  ```
  node index.js
  ```

A clean-state server is now deployed.


## Built With

* [Express](https://expressjs.com/) - Node.js Module
* [express-fileupload](https://github.com/richardgirges/express-fileupload) - Node.js Module
* [Node-adodb](https://github.com/nuintun/node-adodb) - Node.js Module

## Authors

**Evyatar Ben-Shitrit** - [eviabs](https://github.com/eviabs)

## License

This project is licensed under the MIT License

