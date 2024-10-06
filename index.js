// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// Initialize OpenAI
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    registerCommands();
});

// Function to register slash commands
async function registerCommands() {
    try {
        const guilds = await client.guilds.fetch();
        guilds.forEach(async (guild) => {
            const commands = guild.commands;

            await commands.create({
                name: 'summarize',
                description: 'Summarize a user\'s messages from the past 12 months',
                options: [
                    {
                        name: 'username',
                        type: 6, // USER type
                        description: 'The user to summarize',
                        required: true,
                    },
                ],
            });

            console.log(`Registered /summarize command for guild: ${guild.name}`);
        });
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'summarize') {
        const user = interaction.options.getUser('username');
        await interaction.deferReply();

        let statusMessage;
        try {
            statusMessage = await interaction.followUp({
                content: `Fetching messages: ${user.tag}\nMessages fetched: 0`,
                fetchReply: true
            });
            console.log(`Started fetching messages for ${user.tag}`);
        } catch (error) {
            console.error('Error sending status message:', error);
            await interaction.editReply('Failed to send status message.');
            return;
        }

        let fetchedMessages = [];
        let lastMessageId = null;
        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
        let totalFetched = 0;

        while (true) {
            const options = { limit: 50 };
            if (lastMessageId) {
                options.before = lastMessageId;
            }

            let messages;
            try {
                messages = await interaction.channel.messages.fetch(options);
            } catch (error) {
                console.error('Error fetching messages:', error);
                await interaction.editReply('Failed to fetch messages.');
                return;
            }

            if (messages.size === 0) break;

            const userMessages = messages.filter(msg => msg.author.id === user.id && msg.createdTimestamp >= oneYearAgo);
            fetchedMessages.push(...userMessages.map(msg => msg.content));
            totalFetched += userMessages.size;

            // Update status message
            try {
                await statusMessage.edit(`Fetching messages: ${user.tag}\nMessages fetched: ${totalFetched}`);
                console.log(`Fetched ${totalFetched} messages so far.`);
            } catch (error) {
                console.error('Error updating status message:', error);
            }

            lastMessageId = messages.last().id;

            // Check if we've reached messages older than one year
            const oldestMessage = messages.last();
            if (oldestMessage.createdTimestamp < oneYearAgo) break;

            // Delay of 5 seconds
            await delay(5000);
        }

        // Combine all messages into a single text
        const combinedText = fetchedMessages.join('\n');
        console.log(`Total messages fetched: ${totalFetched}`);

        // Use OpenAI to summarize
        try {
            const response = await openai.createChatCompletion({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are a helpful assistant that summarizes user messages." },
                    { role: "user", content: `Summarize the following messages:\n\n${combinedText}` }
                ],
                max_tokens: 1024,
                temperature: 0.5,
            });

            const summary = response.data.choices[0].message.content;
            console.log('Summary generated successfully.');

            // Send the summary
            await interaction.followUp({
                content: `**Summary of ${user.tag}'s messages:**\n${summary}`,
                ephemeral: false
            });

            // Delete the status message
            await statusMessage.delete();
        } catch (error) {
            console.error('Error with OpenAI API:', error);
            await interaction.followUp({
                content: 'An error occurred while summarizing the messages.',
                ephemeral: true
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to login:', error);
});
// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// Initialize OpenAI
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    registerCommands();
});

// Function to register slash commands
async function registerCommands() {
    try {
        const guilds = await client.guilds.fetch();
        guilds.forEach(async (guild) => {
            const commands = guild.commands;

            await commands.create({
                name: 'summarize',
                description: 'Summarize a user\'s messages from the past 12 months',
                options: [
                    {
                        name: 'username',
                        type: 6, // USER type
                        description: 'The user to summarize',
                        required: true,
                    },
                ],
            });

            console.log(`Registered /summarize command for guild: ${guild.name}`);
        });
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'summarize') {
        const user = interaction.options.getUser('username');
        await interaction.deferReply();

        let statusMessage;
        try {
            statusMessage = await interaction.followUp({
                content: `Fetching messages: ${user.tag}\nMessages fetched: 0`,
                fetchReply: true
            });
            console.log(`Started fetching messages for ${user.tag}`);
        } catch (error) {
            console.error('Error sending status message:', error);
            await interaction.editReply('Failed to send status message.');
            return;
        }

        let fetchedMessages = [];
        let lastMessageId = null;
        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
        let totalFetched = 0;

        while (true) {
            const options = { limit: 50 };
            if (lastMessageId) {
                options.before = lastMessageId;
            }

            let messages;
            try {
                messages = await interaction.channel.messages.fetch(options);
            } catch (error) {
                console.error('Error fetching messages:', error);
                await interaction.editReply('Failed to fetch messages.');
                return;
            }

            if (messages.size === 0) break;

            const userMessages = messages.filter(msg => msg.author.id === user.id && msg.createdTimestamp >= oneYearAgo);
            fetchedMessages.push(...userMessages.map(msg => msg.content));
            totalFetched += userMessages.size;

            // Update status message
            try {
                await statusMessage.edit(`Fetching messages: ${user.tag}\nMessages fetched: ${totalFetched}`);
                console.log(`Fetched ${totalFetched} messages so far.`);
            } catch (error) {
                console.error('Error updating status message:', error);
            }

            lastMessageId = messages.last().id;

            // Check if we've reached messages older than one year
            const oldestMessage = messages.last();
            if (oldestMessage.createdTimestamp < oneYearAgo) break;

            // Delay of 5 seconds
            await delay(5000);
        }

        // Combine all messages into a single text
        const combinedText = fetchedMessages.join('\n');
        console.log(`Total messages fetched: ${totalFetched}`);

        // Use OpenAI to summarize
        try {
            const response = await openai.createChatCompletion({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are a helpful assistant that summarizes user messages." },
                    { role: "user", content: `Summarize the following messages:\n\n${combinedText}` }
                ],
                max_tokens: 1024,
                temperature: 0.5,
            });

            const summary = response.data.choices[0].message.content;
            console.log('Summary generated successfully.');

            // Send the summary
            await interaction.followUp({
                content: `**Summary of ${user.tag}'s messages:**\n${summary}`,
                ephemeral: false
            });

            // Delete the status message
            await statusMessage.delete();
        } catch (error) {
            console.error('Error with OpenAI API:', error);
            await interaction.followUp({
                content: 'An error occurred while summarizing the messages.',
                ephemeral: true
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to login:', error);
});
