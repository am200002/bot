const Discord = require("discord.js");
const { Client, Collection, MessageEmbed } = require('discord.js');
const fs = require("fs");
const bdd = require("bdd");
const fetch = require('node-fetch');
const ytdl = require("ytdl-core");
const list = require("youtube-node");
const queue = new Map();
const prefix = "!"
const search = require('youtube-search');

const client = new Discord.Client();

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

//          PLAYING
client.on('ready', () => {
console.log(`Logged in as ${client.user.tag}!`)
client.user.setStatus('online')
client.user.setPresence({
game: {
        name: 'Justice pour les Arméniens !',
        type: "Playing",
        url: "https://discordapp.com/"}});
client.user.setActivity('Justice pour les Arméniens !');
});

client.on("message", async message => {
        if (message.author.bot) {
                return;
        }
        if (!message.content.startsWith(prefix)) {
                return;
        }

        const serverQueue = queue.get(message.guild.id);

        if (message.content.startsWith(`${prefix}play`)) {
                execute(message, serverQueue); // On appel execute qui soit initialise et lance la musique soit ajoute à la queue la musique
                return;
        }
        else if (message.content.startsWith(`${prefix}skip`)) {
                skip(message, serverQueue); // Permettra de passer à la musique suivante
                return;
        }
        else if (message.content.startsWith(`${prefix}stop`)) {
                stop(message, serverQueue); // Permettra de stopper la lecture
                return;
        }
        else {
                //message.channel.send("You need to enter a valid command!");
        }

});

async function execute(message, serverQueue) {
        const args = message.content.split(" "); // On récupère les arguments dans le message pour la suite

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) // Si l'utilisateur n'est pas dans un salon vocal
        {
                return message.channel.send(
                    "Vous devez être dans un salon vocal!"
                );
        }
        const permissions = voiceChannel.permissionsFor(message.client.user); // On récupère les permissions du bot pour le salon vocal
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) { // Si le bot n'a pas les permissions
                return message.channel.send(
                    "J'ai besoin des permissions pour rejoindre le salon et pour y jouer de la musique!"
                );
        }

        const songInfo = await ytdl.getInfo(args[1]);
        const song     = {
                title: songInfo.videoDetails.title,
                url  : songInfo.videoDetails.video_url,
        };

        if (!serverQueue) {
                const queueConstruct = {
                        textChannel : message.channel,
                        voiceChannel: voiceChannel,
                        connection  : null,
                        songs       : [],
                        volume      : 1,
                        playing     : true,
                };

                // On ajoute la queue du serveur dans la queue globale:
                queue.set(message.guild.id, queueConstruct);
                // On y ajoute la musique
                queueConstruct.songs.push(song);

                try {
                        // On connecte le bot au salon vocal et on sauvegarde l'objet connection
                        var connection           = await voiceChannel.join();
                        queueConstruct.connection = connection;
                        // On lance la musique
                        play(message.guild, queueConstruct.songs[0]);
                }
                catch (err) {
                        //On affiche les messages d'erreur si le bot ne réussi pas à se connecter, on supprime également la queue de lecture
                        console.log(err);
                        queue.delete(message.guild.id);
                        return message.channel.send(err);
                }
        }
        else {
                serverQueue.songs.push(song);
                console.log(serverQueue.songs);
                return message.channel.send(`👍**${song.title}** a été ajouté à la liste !`);
        }

}

function skip(message, serverQueue) {
        if (!message.member.voice.channel) // on vérifie que l'utilisateur est bien dans un salon vocal pour skip
        {
                return message.channel.send(
                    "Vous devez être dans un salon vocal pour passer une musique!"
                );
        }
        if (!serverQueue) // On vérifie si une musique est en cours
        {
                return message.channel.send("Aucune lecture de musique en cours !");
        }
        serverQueue.connection.dispatcher.end(); // On termine la musique courante, ce qui lance la suivante grâce à l'écoute d'événement
                                                 // finish
}

function stop(message, serverQueue) {
        if (!message.member.voice.channel) // on vérifie que l'utilisateur est bien dans un salon vocal pour skip
        {
                return message.channel.send(
                    "Vous devez être dans un salon vocal pour stopper la lecture!"
                );
        }
        if (!serverQueue) // On vérifie si une musique est en cours
        {
                return message.channel.send("Aucune lecture de musique en cours !");
        }
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
        console.log(song);
        const serverQueue = queue.get(guild.id); // On récupère la queue de lecture
        if (!song) { // Si la musique que l'utilisateur veux lancer n'existe pas on annule tout et on supprime la queue de lecture
                serverQueue.voiceChannel.leave();
                queue.delete(guild.id);
                return;
        }
        // On lance la musique
        const dispatcher = serverQueue.connection
            .play(ytdl(song.url, { filter: 'audioonly' }))
            .on("finish", () => { // On écoute l'événement de fin de musique
                    serverQueue.songs.shift(); // On passe à la musique suivante quand la courante se termine
                    play(guild, serverQueue.songs[0]);
            })
            .on("error", error => console.error(error));
        dispatcher.setVolume(1); // On définie le volume
        serverQueue.textChannel.send(`Joue maintenant🎶 : **${song.title}**`);
}


client.commands = new Collection();

const commandFiles =  fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
console.log(commandFiles);

for(const file of commandFiles){
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
    console.log(client.commands);
}

Client.on('guildMemberAdd', member => {
    let embed = new Discord.MessageEmbed()
        .setFooter(`Nous sommes désormais ${member.guild.memberCount} membres 😁 `)
        .setAuthor(`${member.user.username} \n Merci à toi de rejoindre le serveur`, member.user.displayAvatarURL())
        .setDescription("Si tu rencontres un soucis, hésite pas à ping un membre de l'équipage pour avoir des renseignements")
        .setColor("#35f092")
        .setImage("https://avf.asso.fr/bourgoin-jallieu/wp-content/uploads/sites/353/2019/03/Bienvenue.jpg")

        member.guild.channels.cache.get("794591160614125568").send(embed)
})
//                              COMMANDS
client.on('message', message => {
//if(message.content.startsWith(`${prefix}site`)) message.channel.send("Voici le site : http://artsakhisarmenia.cf !");
//if(message.content.startsWith(`${prefix}cmd`)) message.channel.send("Les commandes disponibles sur le serveur sont visualisables sur : https://docs.google.com/document/d/1cy_FGwXqf99hW1zLQ_QE3xMvcpdD71xDsBFLGdqwD6k/edit");
//if(message.content.startsWith(`${prefix}devise`)) message.channel.send("ERMENISTAN TERRORIST");
if(message.content.startsWith(`${prefix}prefixe`)) message.channel.send("Le préfixe à mettre avant chaque commande est '!' ");
if(message.content.startsWith(`${prefix}prefix`)) message.channel.send("Le préfixe à mettre avant chaque commande est '!'");
if(message.content.startsWith(`${prefix}préfixe`)) message.channel.send("Le préfixe à mettre avant chaque commande est '!'");
//if(message.content.startsWith(`${prefix}help role`)) message.channel.send(`Pour prendre vos rôles ***!role [role]***
//Pour voir les roles disponibles sur **${message.guild.name}.** sont  : ***!pays*** ; ***!religion*** ; ***!situation***`)
//if(message.content.startsWith(`${prefix}pays`)) message.channel.send(`Les rôles ||*pays*|| disponibles sont : **Arménien, Egyptien, Serbe, Russe, Géorgien, Roumaine, Français, Marocain, Rwandais, Syrien, Libanais, Algérien** *(veuillez écrire les noms des rôles bien à la lettre sans fautes)*`);
//if(message.content.startsWith(`${prefix}religion`)) message.channel.send(`Les rôles ||*religion*|| disponibles sont : **Apostolique, Orthodoxe, Catholique, Protestant, Copte, Musulman** *(veuillez écrire les noms des rôles bien à la lettre sans fautes)*`);
//if(message.content.startsWith(`${prefix}situation`)) message.channel.send(`Les rôles ||*situation*|| disponibles sont : **Collégien, Lycéen, Etudiant, Chômeur** *(veuillez écrire les noms des rôles bien à la lettre sans fautes)*`);
//if(message.content.startsWith(`${prefix}date`)) message.channel.send("Nous sommes le jeudi 24 décembre !");
if(message.content.startsWith(`${prefix}server`)) message.channel.send(`Je suis sur le serveur **${message.guild.name}.**`);
if(message.content.startsWith(`${prefix}user`)) message.channel.send(`Je suis ${message.author.tag}.`);

//              MESSAGE EMBED
if(message.content.startsWith(`${prefix}site`)){
const embed = new MessageEmbed()
.setTitle('Voici le site 📣 :')
.setColor(0xff0000)
.setDescription('http://artsakhisarmenia.cf');
message.channel.send(embed);}

if(message.content.startsWith(`${prefix}devise`)){
const embed = new MessageEmbed()
.setTitle('DEVISE ⁉️ 🇦🇲 :')
.setColor(0xff0000)
.setDescription('ERMENISTAN TERRORIST')
.setImage('https://media1.tenor.com/images/730b285c015e11a79c154117043e436a/tenor.gif')
.setFooter('Artsakh is Armenia', 'https://media1.tenor.com/images/2c7773153879709013ef0f97d42f59ee/tenor.gif');
message.channel.send(embed);}

if(message.content.startsWith(`${prefix}cmd`)){
const embed = new MessageEmbed()
.setTitle('Les commandes disponibles sur le serveur ⏺ :')
.setColor(0xff0000)
.setDescription('https://docs.google.com/document/d/1cy_FGwXqf99hW1zLQ_QE3xMvcpdD71xDsBFLGdqwD6k/edit?usp=sharing');
message.channel.send(embed);}

if(message.content.startsWith(`${prefix}help role`)){
const embed = new MessageEmbed()
.setTitle('️⬇️Pour voir les roles disponibles ⬇️ :')
.setColor(0xff0000)
.setDescription(`!pays
!religion
!situation`);
message.channel.send(embed);}

if(message.content.startsWith(`${prefix}pays`)){
const embed = new MessageEmbed()
.setTitle('🌐 Voici les roles pays disponibles 🌐 :')
.setColor(0xff0000)
.setAuthor(`➡️commande pour vous attribuer un rôle : !role [role]`)
.setDescription(`Arménien
 Egyptien
 Serbe
 Russe
 Géorgien
 Roumain
 Français
 Marocain
 Rwandais
 Syrien
 Libanais
 Algérien`)
 .setFooter('veuillez écrire les noms des rôles bien à la lettre sans fautes');;
message.channel.send(embed);}

if(message.content.startsWith(`${prefix}religion`)){
const embed = new MessageEmbed()
.setTitle(`🎴Voici les roles religion disponibles🎴 :`)
.setColor(0xff0000)
.setAuthor(`➡️commande pour vous attribuer un rôle : !role [role]`)
.setDescription(`Apostolique
Orthodoxe
Catholique
Protestant
Copte
Musulman
Athée`)
.setFooter('veuillez écrire les noms des rôles bien à la lettre sans fautes');;
message.channel.send(embed);}

if(message.content.startsWith(`${prefix}situation`)){
const embed = new MessageEmbed()
.setTitle(`📝Voici les roles situation disponibles📝 :`)
.setColor(0xff0000)
.setAuthor(`➡️commande pour vous attribuer un rôle : !role [role]`)
.setDescription(`Collégien
Lycéen
Etudiant
Chômeur`)
.setFooter('veuillez écrire les noms des rôles bien à la lettre sans fautes');
message.channel.send(embed);}
});



client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).split(/ +/);

  const serverQueue = queue.get(message.guild.id);
  const command = args.shift().toLowerCase();

  if(!client.commands.has(command)) return;
  client.commands.get(command).execute(client, message, args);
  })

client.on('guildMemberAdd', member =>{
    member.guild.channels.find("name", "musique").send(`Bienvenue ${member}`);
})

client.on('guildMemberRemove', member => {
member.guild.channels.find("name", "general").send(`${member} vient de quitter la mafia`)
})

client.on('guildMemberAdd', member => {
    var role = member.guild.roles.find('name', 'Membres');
    member.addRole(role);
})
client.login(process.env.TOKEN)
