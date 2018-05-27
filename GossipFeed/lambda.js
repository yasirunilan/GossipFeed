let AWS = require('aws-sdk');
const sns = new AWS.SNS();
const ddb = new AWS.DynamoDB.DocumentClient();
let request = require('request');
exports.handler = function (event, context, callback) {

	// fetch the latest headlines
	request.get(`https://newsapi.org/v2/top-headlines?sources=entertainment-weekly&apiKey=${process.env.KEY}`, (error, response, body) => {
		// early exit on failure
		let result = JSON.parse(body);
		if (result.status !== "ok") {
			return callback('NewsAPI call failed!');
		}
		// check each article, processing if it hasn't been already
		result.articles.forEach(article => {
			ddb.get({
				TableName: 'gossip',
				Key: { 'url': article.url }
			}, function (err, data) {
				if (err) {
					console.log(`Failed to check for ${article.url}`, err);
				} else {
					if (data.Item) {  // match found, meaning we have already saved it
						console.log(`Gossip already dispatched: ${article.url}`);
					} else {
						let titleLen = article.title.length;
						let descrLen = article.description.length;
						let urlLen = article.url.length;

						// stuff as much content into the text as possible
						let gossipText = article.title;
						if (gossipText.length + descrLen < 160) {
							gossipText += "\n" + article.description;
						}
						if (gossipText.length + urlLen < 160) {
							gossipText += "\n" + article.url;
						}
						// send out the SMS
						sns.publish({
							Message: gossipText,
							MessageAttributes: {
								'AWS.SNS.SMS.SMSType': {
									DataType: 'String',
									StringValue: 'Promotional'
								},
								'AWS.SNS.SMS.SenderID': {
									DataType: 'String',
									StringValue: 'GossipFeed'
								},
							},
							PhoneNumber: process.env.PHONE
						}).promise()
							.then(data => {
								// save the URL so we won't send this out again
								ddb.put({
									TableName: 'gossip',
									Item: { 'url': article.url }
								}, function (err, data) {
									if (err) {
                      					console.log(`Failed to save marker for ${article.url}`, err);
                    				} else {
                     					 console.log(`Saved marker for ${article.url}`);
                    				}
								});
							})
							.catch(err => {
								console.log(`Failed to dispatch SMS for ${article.url}`, err);
							});

					}
				}
			});

		});
		// notify AWS that we're good
      	// (no need to track/notify errors at this stage)
		callback(null, 'Successfully executed');
	})
}