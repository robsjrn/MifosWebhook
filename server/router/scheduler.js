var schedule = require('node-schedule')
, MongoClient = require('mongodb').MongoClient;
var config= require('./config');
var db;
var Client=require('node-rest-client').Client;


client3 = new Client();


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


global.auth2;

initialise();



client3.registerMethod("getloanDetails", config.mifosUrl+"loans/${loanid}?tenantIdentifier="+config.mifostenantIdentifier+"&pretty=true", "GET");
client3.registerMethod("disburseloan", config.mifosUrl+"loans/${loanid}?command=disburse", "POST");



MongoClient.connect(config.DatabaseUrl, function(err, database) {
	  if(err) throw err;
	  
	  db=database;

	  console.log("Scheduler database Configured");
var rule = new schedule.RecurrenceRule();
rule.second = 60;




  


	  schedule.scheduleJob(rule,  function (){
             var d = new Date();
             d.setMinutes(d.getMinutes() - 15);

             console.log("new date is " + d);

		 db.collection('loans', function(err, collection) {
		  collection.findOne({$and:[{"statusid":1},{'created_at': { $lt: d }}]},function(err, item){
		  if(err){ console.log(err) }
		   else { console.log(item)
		   	  if (item==null){}
		   	  else {	
                 processLoan(item);}
		   };
		
		});
		});

		});
//remember to close collection

	});

  var processLoan=function(data){
       	getLoanDetails(data.loanid,function(status,response){
                 	 if (status){console.log("Error Occured Processing Loan " +data.loanid );}
                 	 else {
                           if (response.status.code=='loanStatusType.approved'){
                           	 //loan not yet disbursed 
                           	  //disburse loan
                           	  //update status
                           	  
                           	  console.log("loan not yet disbursed ");
                           	  disburseloan(data);
                           }else {

                           	 //loan either cancelled or dissaproved
                           	 //update status
                             try {
                           	 console.log("the Loan Status is " + response.status.code );

                           	}catch(err){

                           	}
                           }

                 	 }	

                 })

  };

  var disburseloan=function(datas){

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
console.log("disbursment tdate " + ddate);

  	
  	  var args={
        path:{"loanid":datas.loanid},
  	  	data:{
  	  		dateFormat: "dd MMMM yyyy",
  	  		locale: "en",
  	  		actualDisbursementDate: ddate,
  	  		transactionAmount:datas.principal,
  	  		
  	  		note:"disbursed By External system on " + new Date()
  	      },
  	  	headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":config.mifostenantIdentifier,"Authorization":"Basic " + global.auth2} 
  	  };
  	  client3.methods.disburseloan(args,function(data,response){

		 if (data.status==500){
		 	   console.log(data.error);
		 	   datas.statusname='Error disbursing loan ';
		 	   datas.errordescription=data.errors[0].developerMessage;
		 	   datas.statusid=3;
               datas.update_at=new date();
		 	  
		 	   updateStatus(datas);
            
		 }else{
		  console.log("************ Loan Disburse  Details ************* " );
		     console.log(data);
		    
		    console.log("*************************************** " );

                if (data.httpStatusCode=='403'){ 

                	console.log(data.error);
			 	   datas.statusname='Error disbursing loan ';
			 	   datas.errordescription=data.errors[0].developerMessage;
			 	   datas.statusid=3;
	               datas.update_at=new Date();
			 	  
			 	   updateStatus(datas);
			 	}else {

		   var resp={};
		     resp.body=data;
		     resp.rawresponse=response;


		 	   datas.statusname='loan disbursed';
		 	   datas.statusid=2;
               datas.update_at=new Date();
		 	  
		 	   updateStatus(datas);

		     logdisbursedata(resp);
		 }
		 };
		   
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
  var getLoanDetails=function(loanid,callback){
  console.log("Getting Loan Details for loan " + loanid );
     var args = {
		   path:{"loanid":loanid},
		  headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":config.mifostenantIdentifier,"Authorization":"Basic " + global.auth2} 
		};
   	client3.methods.getloanDetails(args,function(data,response){

		 if (data.status==500){
		 	   console.log(data.error);
                callback(true,data);
		 }else{
		  // console.log("************ Loan Details ************* " );
		  //   console.log(data);
		    
		  //   console.log("*************************************** " );
		     callback(false,data);
		 };
		   
        });
};


function initialise(){
	 var args = {
		  headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":config.mifostenantIdentifier} 
		};
		client3.post(config.mifosUrl+"authentication?username="+config.username+"&password="+config.pwd,args,function(data,resp){

		 // console.log(data);
		 // console.log(resp);
		 auth2 = data.base64EncodedAuthenticationKey;


		 console.log("Successfully Authenticated in Mifos");
		});
};



	

	
