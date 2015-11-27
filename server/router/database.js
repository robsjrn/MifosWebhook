var MongoClient = require('mongodb').MongoClient;
var config= require('./config');
var db;


MongoClient.connect(config.DatabaseUrl, function(err, database) {
	  if(err) throw err;
	  
	  db=database;



   exports.ErrorLog = function(errordet) {
  db.collection('errors', function(err, collection) {
  collection.insert(errordet, function(err, item) {
      if (err) {console.log("error Logging an error " +err ) ;}
     else{ 
     	console.log("Error Logged successfully" ) ;
	       }
        });
      });
};

	exports.TransactionLog = function(transaction) {
	  db.collection('savingtransaction', function(err, collection) {
	  collection.insert(transaction, function(err, item) {
	      if (err) {console.log("error Logging  transaction " +transaction ) ;}
	     else{ 
	     	console.log("Transaction Logged" ) ;
		       }
	        });
	      });
	};



     exports.saveloans = function(data) {
		db.collection('loans', function(err, collection) {
		collection.insert(data, function(err, item) {
		   if (err) {console.log("Error saving loan " +err ) ;}
		   else{
			      console.log("Loan saved " ) ;
		   }
		});
		});
		};
      exports.logsTrxn = function(data) {
		db.collection('loantransaction', function(err, collection) {
		collection.insert(data, function(err, item) {
		   if (err) {console.log("Error saving loan Transaction " + err )  ;}
		   else{
			     console.log("loan Transaction saved " ) ;	
		   }
		});
		});
		};


   exports.LoanlogMessage=function(data){

      db.collection('outboundmessages', function(err, collection) {
    collection.insert(data, function(err, item) {
       if (err) {
        console.log("Error saving loan Message " + err ) 
      }
       else{
          console.log("Message logged " ) ;
       }
    });
    });


};

});



