// index.js
require('dotenv').config();
const { Client, Intents, MessageEmbed } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

// Initialize Discord Client
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.MESSAGE_CONTENT
    ]
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
});

// Registering Slash Command
client.on('ready', async () => {
    const guilds = await client.guilds.fetch();

    guilds.forEach(async (guild) => {
        const commands = guild.commands;

        await commands.create({
            name: 'summarize',
            description: 'Summarize a user\'s messages from the past 12 months',
            options: [
                {
                    name: 'username',
                    type: 'USER',
                    description: 'The user to summarize',
                    required: true,
                },
            ],
        });
    });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'summarize') {
        const user = interaction.options.getUser('username');
        await interaction.deferReply();

        const statusMessage = await interaction.followUp({
            content: `Fetching messages: ${user.tag}\nMessages fetched: 0`,
            fetchReply: true
        });

        let fetchedMessages = [];
        let lastMessageId = null;
        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
        let totalFetched = 0;

        while (true) {
            const options = { limit: 50 };
            if (lastMessageId) {
                options.before = lastMessageId;
            }

            const messages = await interaction.channel.messages.fetch(options);
            if (messages.size === 0) break;

            const userMessages = messages.filter(msg => msg.author.id === user.id && msg.createdTimestamp >= oneYearAgo);
            fetchedMessages.push(...userMessages.map(msg => msg.content));
            totalFetched += userMessages.size;

            // Update status message
            await statusMessage.edit(`Fetching messages: ${user.tag}\nMessages fetched: ${totalFetched}`);

            lastMessageId = messages.last().id;

            // Check if we've reached messages older than one year
            const oldestMessage = messages.last();
            if (oldestMessage.createdTimestamp < oneYearAgo) break;

            // Delay of 5 seconds
            await delay(5000);
        }

        // Combine all messages into a single text
        const combinedText = fetchedMessages.join('\n');

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

            // Send the summary
            await interaction.followUp({
                content: `**Summary of ${user.tag}'s messages:**\n${summary}`,
                ephemeral: false
            });

            // Delete the status message
            await statusMessage.delete();
        } catch (error) {
            console.error(error);
            await interaction.followUp({
                content: 'An error occurred while summarizing the messages.',
                ephemeral: true
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
