const fs = require('fs/promises');
const fss = require('fs');
const config = require('../../config.json');
const { PermissionsBitField: Permissions, ChannelType } = require('discord.js');

module.exports = async (user, type) => {
    if (!Object.keys(config.tickets.categories).includes(type) || !fss.existsSync(`json/welcomers/${type}.json`)) throw new InputError('Invalid ticket type!');
    if (!user.username || !user.id) throw new InputError('Invalid user!');

    let ticketNumber = (await dbs.n.findOne({ t: type }))?.n;
    if (typeof ticketNumber != 'number') ticketNumber = 0;
    ticketNumber++;

    const channelName = config.tickets.namingFormat
        .replaceAll('$TYPE', type)
        .replaceAll('$NAME', user.username)
        .replaceAll('$NUMBER', ticketNumber);
    
    const newchannel = await client.guilds.cache.get(config.tickets.server).channels.create({ 
        name: channelName,
        parent: config.tickets.categories[type].category,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            {
                id: user.id,
                allow: [
                    Permissions.Flags.ViewChannel,
                    Permissions.Flags.ReadMessageHistory,
                    Permissions.Flags.SendMessages
                ]
            }
        ]
    });
    
    await dbs.t.insertOne({ user: user.id, channel: newchannel.id, type, n: ticketNumber });
    await dbs.n.updateOne({ t: type }, { $set: { n: ticketNumber } }, { upsert: true });

    const welcomeMessage = JSON.parse((await fs.readFile(`json/welcomers/${type}.json`, 'utf8'))
        .replaceAll('$USER', user.id)
        .replaceAll('$NUMBER', ticketNumber)
        .replaceAll('$PREFIX', config.prefix)
    );

    await newchannel.send(welcomeMessage);

    await client.guilds.cache.get(config.tickets.server).channels.cache.get(config.tickets.categories[type].log).send({
        content: null,
        embeds: [
            {
                title: 'Ticket created',
                description: `Type: \`${type}\`\nTicket number: \`${ticketNumber}\`\nOpened for: <@${user.id}>`,
                color: 0x20c407
            }
        ]
    });

    return newchannel;
}