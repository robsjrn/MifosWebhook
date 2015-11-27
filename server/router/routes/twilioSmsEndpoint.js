var express=require('express');
var router=express.Router();
var Client=require('node-rest-client').Client;
var MongoClient = require('mongodb').MongoClient;
  var twilio = require('twilio');
      var twiml = new twilio.TwimlResponse();


var config= require('../config');
client3 = new Client();


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

client3.registerMethod("rejectloan", config.mifosUrl+"loans/${loanid}?command=reject", "POST");





MongoClient.connect(config.DatabaseUrl, function(err, database) {
	  if(err) throw err;
	  
	  db=database;

router.post('/', function (req, res) {
	  
    try {

          var lid=Number(req.body.Body);
           if (lid==NaN){twiml.message("Invalid Loanid kindly send the Number You Received  ");}
           else {
           	   console.log("Processing Loan Request ");
				   getloanstatus(lid,function(status,message){
				   	  if (status){
				   	  	twiml.message("Error Processing You Request .Kindly Retry later ");
				   	  }
				   	  else{	
				   	  	    console.log(message);

				   	  	     if (message==null){
                              twiml.message("The Loan id does Not exist  ");
				   	  	     }else {
                              if (message.statusid ===1){
                               

                              	console.log("Processing Message");
                              	processAction(message);
                              	twiml.message("Thank You Loan  Cancellation in Progress  ");
                              }
                              else {
                              	twiml.message("Thank You The Loan Was not Proccessed successfuly Kindly Contact Us for More Details");
                              }
                              
                           }
				   	 	
                	}
                });


   }
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());

}catch(err){
	twiml.message("Error Processing You Request .Kindly Retry later ");
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
}
});


    var processAction=function(data){
           
         
			 	  
			 	   cancelloan(data);

	};

 var getloanstatus=function(loanid,callback){
   console.log("Processing Loan Request " + loanid);
   db.collection('loans', function(err, collection) {
    collection.findOne({"loanid":loanid},function(err, item){
	  if(err){ 
         console.log(err);
	  	callback(true,error);}
	  else { 
         
	  	callback(false,item) };
	  
	   });
    });
 };

 var cancelloan=function(datas){
    console.log("cancelling Loans ");
 	  	var d= new Date();
  	var day =d.getDate();
  	

   var month = new Array();
month[0] = "January";
month[1] = "February";
month[2] = "March";
month[3] = "April";
month[4] = "May";
month[5] = "June";
month[6] = "July";
month[7] = "August";
month[8] = "September";
month[9] = "October";
month[10] = "November";
month[11] = "December";
var n = month[d.getMonth()];
var year = d.getFullYear(); 

var ddate= day + " " + n + " " + year;
 	 var args={
        path:{"loanid":datas.loanid},
  	  	data:{
  	  		locale: "en",
		    dateFormat: "dd MMMM yyyy",
		    rejectedOnDate: ddate,
		    note: "Loan rejected "
  	      },
  	  	headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":"default","Authorization":"Basic " + global.auth} 
  	  };
  	  client3.methods.rejectloan(args,function(data,response){
  	  	       	 if (data.status==500){
		 	   console.log(data.error);
		 	   datas.statusname='Error Cancelling loan ';
		 	   datas.errordescription=data.errors[0].developerMessage;
		 	   datas.statusid=4;
               datas.update_at=new date();
		 	  
		 	   updateStatus(datas);
            
		 }else{
	              console.log(data);

                if (data.httpStatusCode=='403'){ 

                	console.log(data.error);
			 	   datas.statusname='Error Cancelling loan ';
			 	   datas.errordescription=data.errors[0].developerMessage;
			 	   datas.statusid=5;
	               datas.update_at=new Date();
			 	  
			 	   updateStatus(datas);
			 	}else {

		   var resp={};
		     resp.body=data;
		     resp.rawresponse=response;


		 	   datas.statusname='loan cancelled';
		 	   datas.statusid=6;
               datas.update_at=new Date();
		 	  
		 	   updateStatus(datas);

		     logdisbursedata(resp);
		 }
		 };
  	  });

 };

	  var updateStatus=function(data){
               db.collection('loans', function(err, collection) {
				    collection.update({"loanid" : data.loanid},{$set:data},{safe:true}, function(err, item) {
				     if(err){
						 console.log("Error Updating Record");
							  //impliment to delete landlord array
						 }
					  else{  console.log("Record Updated to disbursed");}
				      });
				   });

  };


  var logdisbursedata=function(data){
       data.created_at=new Date();
   	 db.collection('disbursedata', function(err, collection) {
  collection.insert(data, function(err, item) {
      if (err) {console.log("error Saving disburse data ");}
     else{  
     	 console.log(" disburse data Saved ");
	       }
        });
      });

  };


});

  module.exports=router