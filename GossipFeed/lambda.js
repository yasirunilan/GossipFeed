let AWS = require('aws-sdk');
exports.handler = function(event, context, callback) {


	request.get(`https://newsapi.org/v2/top-headlines?sources=entertainment-weekly&apiKey=your-api-key`,
  		(error, response, body) => {

    		callback(null,'Successfully executed');
  	})
}