var Client = require('node-rest-client').Client;

client = new Client();
 
// direct way 
client.get("http://www.google.co.ke", function(data, response){
            // parsed response body as js object 
            console.log(data);
            // raw response 
            console.log(response);
        });