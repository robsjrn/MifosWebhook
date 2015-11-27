var express=require('express');
var router=express.Router();
var sms= require('../smsapi');
var config= require('../config');
var util=require('util');
var S = require('string');
var async=require("async");
var Client=require('node-rest-client').Client;
var db= require('../database');
client2 = new Client();


var auth2;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


initialise();




client2.registerMethod("getclientDetails", config.mifosUrl+"clients/${id}?tenantIdentifier=default&pretty=true", "GET");
client2.registerMethod("getgroupmembers", config.mifosUrl+"groups/${groupid}?associations=clientMembers&tenantIdentifier=default&pretty=true", "GET");
client2.registerMethod("getloanDetails", config.mifosUrl+"loans/${loanid}?tenantIdentifier=default&pretty=true", "GET");

router.post('/', function (req, res) {
	processAction(req);
  res.send('Hello World!');
});


function initialise(){
  console.log("url " + config.mifosUrl);
   var args = {
      headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":config.mifostenantIdentifier} 
    };
    client2.post(config.mifosUrl+"authentication?username="+config.username+"&password="+config.pwd,args,function(data,resp){

     // console.log(data);
    //  console.log(resp);
    auth2 = data.base64EncodedAuthenticationKey;


     console.log("Successfully Authenticated in Mifos for Loan  Route  Auth Key" +auth2);
    });
};




var processAction=function(data){

	switch(data.headers['x-mifos-action']){

	    	case 'APPROVE':
                 getdetails(data.body,function(status,resp){
                 	 if (status){
                    db.ErrorLog(resp) ;
                  }
                 	 else {
                 	 
                 	 	resp.statusname='pending approval';
                 	 	resp.statusid=1;
                 	 	resp.created_at=new Date();
                 	 	db.saveloans(resp);
                 	 }
                 	
                 });
              break;
         case 'DISBURSE':

              getClientDetails(data.body.clientId,function(status,resp){
                   
                    if (status){db.ErrorLog(resp) ;}
                 	 else {sendDisburseSms(resp,function(status,response){
                           if (status){db.ErrorLog(response) ;}
                           else{db.LoanlogMessage(response);}
                 	 });
                 	}

              });

         
                           
           break;  


	};

};


var getdetails=function(reqdata,callback){
  //console.log(reqdata);
var data={};

	async.waterfall([
           function(callback1){
                 getClientDetails(reqdata.clientId,function(status,response){
                 	 if (status){callback1(response);}
                 	 else {data.clientdetails=response;callback1(null,response);}	

                 })
           },
          
              function(a,callback1){
              	getgroupdetails(data.clientdetails.groupid,function(status,response){
                 	 if (status){callback1(response);}
                 	 else {data.groupmembers=response;callback1(null,response);}	

                 })
           }, function(b,callback1){
              	getLoanDetails(reqdata.loanId,function(status,response){
                 	 if (status){callback1(response);}
                 	 else {data.loandetails=response;callback1(null,response);}	

                 })
           }, function(c,callback1){
              	sendSms(data,function(status,response){
                 	 if (status){callback1(response);}
                 	 else {data.loandetails=response;callback1(null,response);}	

                 })
           }, function(d,callback1){
                 sendwaitingApproval(data.clientdetails,function(status,response){
                 	 if (status){callback1(response);}
                 	 else {callback1(null,response);}	

                 }) 
           }
             

		],function(err,result){

          if (err)  {console.log(err);callback(true,err)} 
          else {callback(false,result);}  
		});

	
};


var getClientDetails=function(clientid,callback){
     var det={};
    	var args = {
    		   path:{"id":clientid},
    		  headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":"default","Authorization":"Basic " + auth2} 
    		};
	   client2.methods.getclientDetails(args,function(data,response){

	   	    if (data.status==500){
		 	   console.log(data.error);
                callback(true,data);
		 }
	   	   	else {
		 //  console.log("************ Client Details ************* " );
		 //   console.log(data);
		 //    console.log("*************************************** " );
		     det.mobileNo=data.mobileNo;
		     det.names=data.firstname;
		     try {
		     det.groupid=data.groups[0].id;
		       }catch(err){det.groupid=[];}
		     callback(false,det);
             } ; 

		    
        });
};

var getgroupdetails=function(groupid,callback){

	
	var args = {
		   path:{"groupid":groupid},
		  headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":"default","Authorization":"Basic " + auth2} 
		};
	client2.methods.getgroupmembers(args,function(data,response){

		 if (data.status==500){
		 	   console.log(data.error);
                callback(true,data);
		 }else{
		  // console.log("************ group Members  Details ************* " );
		  //   console.log(data.clientMembers);
		  //   console.log("*************************************** " );
		     callback(false,data.clientMembers);
		 };
		   
        });
};

var getLoanDetails=function(loanid,callback){
  console.log("Getting Loan Details for loan " + loanid );
     var args = {
		   path:{"loanid":loanid},
		  headers:{"Content-Type": "application/json","X-Mifos-Platform-TenantId":"default","Authorization":"Basic " + auth2} 
		};
   	client2.methods.getloanDetails(args,function(data,response){

		 if (data.status==500){
		 	   console.log(data.error);
                callback(true,data);
		 }else{
		  // console.log("************ Loan Details ************* " );
		  //   console.log(data);
      try {
		     var det={};
		      det.principal=data.principal;
		      det.period=data.termFrequency;
		      det.loanid=data.id;
		      det.currency=data.currency.code;
		  //   console.log("*************************************** " );
         
		     callback(false,det);
         }catch(err){
            callback(true,err);
         }
		 };
		   
        });
};

var sendSms=function(data,callback){
	//console.log(data);
       async.forEach(data.groupmembers, function (item, callback2) {
                       var msg=util.format('Dear %s , %s Has Requested a Loan of  %s %s.Send the number %s  to +1 774-633-2190 within 15 minutes to cancel the Loan Request ',item.firstname,data.clientdetails.names,data.loandetails.principal,data.loandetails.currency,data.loandetails.loanid); 
	               	   sms.sendSMS("+254"+ S(item.mobileNo).right(9).s,msg,function(status,re){
                          if (status){
                         // 	console.log("Message sent");
                          data.item=item;
                         logMessage(data);
                           callback2();
                          }else {
                          //	console.log("Message NOT sent");
                          callback2();
                          }
               	    });

             },function(err,msg){
    // All tasks are done now
      if (err){callback(true,msg)}
      	else { console.log("all SMS send");callback(false,msg);}
   
  });
};

var sendDisburseSms=function(data,callback){
	//console.log(data);

	var msg=util.format('Dear %s your loan Request Has been disbursed to Your account ',data.names);               	 
               	   sms.sendSMS("+254"+ S(data.mobileNo).right(9).s,msg,function(status,re){
                          if (status){
                          //	console.log("Message sent");
                            logMessage(data);
                          	callback(false,re);
                          }else {
                         // 	console.log("Message NOT sent");
                          	callback(true,re);
                          }
               	    });

};



var sendwaitingApproval=function(data,callback){
	//console.log(data);

	var msg=util.format('Dear %s your loan Request Has been Received and is waiting Approval from Your Group Members  ',data.names);               	 
               	   sms.sendSMS("+254"+ S(data.mobileNo).right(9).s,msg,function(status,re){
                          if (status){
                         	console.log("Waiting Approval Message sent");
                          	callback(false,re);
                          }else {
                          	console.log("Waiting Approval Message NOT sent " + re);

                          	callback(true,re);
                          }
               	    });

};

 
module.exports=router