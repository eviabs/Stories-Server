# Stories-Server

This is the server side of the project. 
The server serves get/post requests sent from the app/browser.

Once a clean server is was deployed, it can start serve it's app.

For the app see [Stories-Client](https://github.com/eviabs/Stories-Client).

## Getting Started

The server is a node.js app that interacts with access db. 
At this moment, the server can run only on a **Windows** platform.
These instructions will get you a copy of the project up and running on your local machine.

### Installing And Deployment

* Install [Node.js](https://nodejs.org/en/download/current/)

* Copy the server's content into a new directory (this includes all of the needed modules and server's files).

* Rename the file *db/empty_db.accdb* to *db/db.accdb*.

* Install [Microsoft Access Database Engine 2010](https://www.microsoft.com/en-us/download/details.aspx?id=13255) (*a reboot might be needed*)

* Run the *index.js* file

  ```
  node index.js
  ```

A clean-state server is now deployed.


## Built With

* [Express](https://expressjs.com/) - Node.js Module
* [express-fileupload](https://github.com/richardgirges/express-fileupload) - Node.js Module
* [Node-adodb](https://github.com/nuintun/node-adodb) - Node.js Module
* [ejs](https://www.npmjs.com/package/ejs) - Node.js Module


## Authors

**Evyatar Ben-Shitrit** - [eviabs](https://github.com/eviabs)

## License

This project is licensed under the MIT License.

