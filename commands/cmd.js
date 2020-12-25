 const commands = require('./commands')

 module.exports = class Cmd extends commands{

 static match (message) {
 return message.content.startsWith('!hello')
 }

 static action (message){
 let args = message.content.split('')
 args.shift()
 message.reply('hello world');
 }

 };