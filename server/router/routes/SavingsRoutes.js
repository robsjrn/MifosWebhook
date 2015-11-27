var express=require('express');
var router=express.Router();
var Client=require('node-rest-client').Client;
var sms= require('../smsapi');
var util=require('util');
var S = require('string');
var async = require('async');
var config= require('../config');
var db= require('../database');
var async=require("async");
client = new Client();


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


var auth;

initialise();

client.registerMethod("getclientDetails", config.mifosUrl+"clients/${id}?tenantIdentifier="+config.mifostenantIdentifier+"&pretty=true", "GET");
client.registerMethod("gettransactionDetails", config.mifosUrl+"savingsaccounts/${accountid}/transactions/${transactionid}?tenantIdentifier="+config.mifostenantIdentifier+"&pretty=true", "GET");
                                                
router.post('/', function (req, res) {
	//console.log(req.headers);
	//console.log(req.body);
	processAction(req);
  res.send('Hello World!');
});

var processAction=function(data){

	switch(data.headers['x-mifos-action']){

		case 'DEPOSIT':
		      data.body.msgtype='DEPOSIT';
               processdetails(data.body,function(status,resp){
               	  resp.created_at=new Date();
                    if (status){db.ErrorLog(resp) ;}
                    else {db.TransactionLog(resp);} 	
               });
              break;
         case 'WITHDRAWAL':
              data.body.msgtype='WITHDRAWAL';
               processdetails(data.body,function(status,resp){
                  resp.created_at=new Date();
                    if (status){db.ErrorLog(resp) ;}
                    else {db.TransactionLog(resp);}	
               });
              break;  


	};

};


var getclientDetails=function(clientid,callback){
  //  console.log("Getting Client Details ...");
	var det={};
	var args = {
		   path:{"id":clientid},
		  headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":config.mifostenantIdentifier,"Authorization":"Basic " + auth} 
		};

    	client.methods.getclientDetails(args,function(data,response){

    		//console.log("***Client details****");
    		//console.log(data);
    		//console.log("***Client details****");
		       if (data.status==401){
                  callback(true,data);
                  //log this Error Occurred 
		       }else {	   
		     callback(false,data);
		};
		});   		

};
var gettransactiondetails=function(acctid,tranid,callback){

	
	var args = {
		   path:{"accountid":acctid,"transactionid":tranid},
		  headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":config.mifostenantIdentifier,"Authorization":"Basic " + auth} 
		};
	client.methods.gettransactionDetails(args,function(data,response){

		//console.log("***Transaction  details****");
    	//	console.log(data);
    	//	console.log("***Transaction  details****");
		 if (data.status==500){
		 	    console.log(data.error);
                callback(true,data);
		 }else{
		 	 callback(false,data);
		 };
		   
        });
};



function initialise(){
	 var args = {
		  headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":config.mifostenantIdentifier} 
		};
		client.post(config.mifosUrl+"authentication?username="+config.username+"&password="+config.pwd,args,function(data,resp){
		auth = data.base64EncodedAuthenticationKey;
		 console.log("Successfully Authenticated in Mifos for saving Route Auth Key  " +auth);
		});
};

var sendSms=function(resp,msgtype,callback){
   if (msgtype=='DEPOSIT'){  var msg=util.format('Dear %s An Amount of %s  %s has been deposited in Your account %s',resp.clientdetails.firstname,resp.transactiondetails.amount,resp.transactiondetails.currency.code,resp.transactiondetails.accountNo); }
   else	if (msgtype=='WITHDRAWAL'){ var msg=util.format('Dear %s An Amount of %s  %s has been Withdrawn in Your account %s',resp.clientdetails.firstname,resp.transactiondetails.amount,resp.transactiondetails.currency.code,resp.transactiondetails.accountNo); }
   	
     var mobilenumber="+254"+ S(resp.clientdetails.mobileNo).right(9).s;
	      sms.sendSMS(mobilenumber,msg,function(status,re){
                          if (status){
                          	console.log("Message sent");
                          	callback(false,re);
                          }else {
                          	console.log("Message NOT sent");
                          	callback(true,re);
                          }
               	    });

};


var processdetails=function(reqdata,callback){
var data={};

	async.waterfall([
           function(callback1){
                 getclientDetails(reqdata.clientId,function(status,response){
                 	 if (status){callback(response);}
                 	 else {data.clientdetails=response;callback1(null,response);}	

                 })
           },
          
           function(a,callback1){
                 gettransactiondetails(reqdata.savingsId,reqdata.resourceId,function(status,response){
                 	 if (status){callback1(response);}
                 	 else {data.transactiondetails=response;callback1(null,response);}	

                 }) 
           },
            function(b,callback1){
                 sendSms(data,reqdata.msgtype,function(status,response){
                 	 if (status){callback1(response);}
                 	 else {data.smsdetails=response;callback1(null,data);}	

                 }) 
           }
             

		],function(err,result){
              
          if (err)  {console.log(err);
          	callback(true,err)
          } 
          else {
          	callback(false,result);
          }  
		});

	
};





module.exports=router