var twilio = require('twilio');

var client = new twilio.RestClient('AC5dabe402352ad3b7eadad650dccd3c8c', '4ffa6f3ff6fb7f461996e4a992e24b93');


exports.sendSMS=function(phoneNumber,msg,fn){
  var msgs={};
  client.sms.messages.create({
    to:phoneNumber,
    from:'+17746332190',
    body:msg
}, function(error, message) {
   
    if (!error) {

		 msgs.Details=message;
		 msgs.Status=1;
		fn(true,msgs);//correct this late
    } else {
      console.log(error);
         msgs.Error=error;
	     msgs.Status=0;
        fn(false,msgs);
    }
}); 
};