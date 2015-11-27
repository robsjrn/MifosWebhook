

module.exports=function(app){

app.use('/Loan',require('./routes/LoanRoutes'));
app.use('/Saving',require('./routes/SavingsRoutes'));
app.use('/Sms',require('./routes/twilioSmsEndpoint'));

};