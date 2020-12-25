module.exports = {
    name: 'ping',
    description: 'renvoie pong.',
    execute(client, message, args){
    console.log(message);
        message.channel.send('Pong !');
    }
}