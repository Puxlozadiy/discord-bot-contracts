const {MessageActionRow, MessageButton, Client, Interaction, MessageSelectMenu, ThreadChannel, Channel, ChannelManager, CategoryChannel, MessageEmbed, Permissions, MessageAttachment} = require('discord.js')
const fs = require('fs');
const { type } = require('os');
const getJob = require('./get_job')

const client = new Client({
    intents: [
        'GUILD_MESSAGES',
        'GUILDS',
        'GUILD_MESSAGE_REACTIONS',
        'GUILD_MEMBERS',
    ],
    partials: ['REACTION', 'MESSAGE', 'CHANNEL', 'GUILD_MEMBER','USER']
})


const vacancyInfoButtons = new MessageActionRow().addComponents(
    [
        new MessageButton()
            .setCustomId('add-contract')
            .setLabel('Добавить контракт')
            .setStyle('PRIMARY')
            .setDisabled(true),
        new MessageButton()
            .setCustomId('delete-contract')
            .setLabel('Удалить контракт')
            .setStyle('PRIMARY')
            .setDisabled(true),
        new MessageButton()
            .setCustomId('schoose-worker-count')
            .setLabel('Кол-во работников')
            .setStyle('PRIMARY')
            .setDisabled(true),
        new MessageButton()
            .setCustomId('public-vacancy')
            .setLabel('Опубликовать вакансию')
            .setStyle('SUCCESS')
            .setDisabled(true)
    ]
)

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if(newMember._roles.length == 0){
        var jobgivers = JSON.parse(fs.readFileSync('./jobgivers.json', 'utf-8'))
        jobgivers = jobgivers.filter(value => {
            if(value.id != newMember.user.id) return value
        })
        fs.writeFileSync('./jobgivers.json', JSON.stringify(jobgivers, null, 2))
    }
    if(newMember._roles[0] == '968409451595956254'){
        var jobgivers = JSON.parse(fs.readFileSync('./jobgivers.json', 'utf-8'))
        jobgivers.push({id: newMember.user.id, jobs: [], vacancyCount: 0})
        fs.writeFileSync('./jobgivers.json', JSON.stringify(jobgivers, null, 2))
    }
})

client.on('messageReactionAdd', async (reaction, user) => {
    dt = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Moscow'}))
    console.log(`${dt.getHours()}:${dt.getMinutes()} ${user.username} добавил реакцию ${reaction.emoji}`)
    if(reaction.message.channel.id == 969512049493303306n){
        var jobgivers = JSON.parse(fs.readFileSync('./jobgivers.json', 'utf-8'))
        for(var i = 0; i < jobgivers.length; i++){
            if(jobgivers[i].id == user.id){
                job = getJob(reaction.emoji.identifier)
                if(jobgivers[i].jobs.length + 1 <= 5) jobgivers[i].jobs.push(job)
            }
        }
        fs.writeFileSync('./jobgivers.json', JSON.stringify(jobgivers, null, 2))
    }
})

client.on('messageReactionRemove', async (reaction, user) => {
    dt = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Moscow'}))
    console.log(`${dt.getHours()}:${dt.getMinutes()} ${user.username} убрал реакцию ${reaction.emoji}`)
    if(reaction.message.channel.id == 969512049493303306n){
        var jobgivers = JSON.parse(fs.readFileSync('./jobgivers.json', 'utf-8'))
        for(var i = 0; i < jobgivers.length; i++){
            if(jobgivers[i].id == user.id){
                job = getJob(reaction.emoji.identifier)[0]
                jobgivers[i].jobs = jobgivers[i].jobs.filter((value, index, arr) => {
                    if(value[0] != job && value.length != 0) return value
                })
            }
        }
        fs.writeFileSync('./jobgivers.json', JSON.stringify(jobgivers, null, 2))
    }
})


client.on('interactionCreate', async interaction => {
    dt = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Moscow'}))
    log = `${dt.getHours()}:${dt.getMinutes()} ${interaction.user.username} нажал "${interaction.customId}"`
    if(interaction.isButton()){
        if(interaction.customId === 'new-vacancy'){
            interaction.deferUpdate()
            var users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'))
            /* for(var i = 0; i < users.length; i++){
                target_user = users[i]
                if(interaction.user.id == target_user.id){
                    if(target_user.cooldown != 0){
                        interaction.user.send({content: 'Заказ можно делать 1 раз в 30 минут!'})
                        return
                    }
                }
            } */
            vacancyInfo = JSON.parse(fs.readFileSync('./vacancy-info.json', 'utf-8'))
            channelName = `вакансия-${vacancyInfo.vacancyCount}`
            category = interaction.guild.channels.cache.get('971361278905946142')
            jobgivers = JSON.parse(fs.readFileSync('./jobgivers.json', 'utf-8'))
            var availableJobs = []
            for(var jobgiver of jobgivers){
                if(jobgiver.id == interaction.user.id){
                    if(jobgiver.jobs.length == 0){
                        interaction.user.send({content: 'Пожалуйста выберите контракты, которые вам доступны в канале "указать-контракты".'})
                        return
                    }
                    for(var job of jobgiver.jobs){
                        availableJobs.push(job)
                    }
                    break
                }
            }
            if(availableJobs != []){
                const embed = new MessageEmbed().setTitle(`Вакансия №${vacancyInfo.vacancyCount.toString()}`).setFields(
                    {name: 'Контракт:', value: '-', inline: true},
                    {name: '\u200B', value: '\u200B', inline: true},
                    {name: 'Оплата:', value: '-', inline: true},
                    {name: '\u200B', value: '\u200B'},
                    {name: 'Время выполнения:', value: '-', inline: true},
                    {name: 'Итоговая оплата:', value: '-', inline: true},
                )
                var channel = await interaction.guild.channels.create(channelName, {
                    type: 'GUILD_TEXT',
                    parent: category,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: ['VIEW_CHANNEL'],
                        },
                        {
                            id: interaction.user.id,
                            allow: ['VIEW_CHANNEL'],
                        },
                    ],
                });
                newVacancy = {
                    vacancyNum: vacancyInfo.vacancyCount, 
                    vacancyChannel: channel.id, 
                    ended: false, dealerId: interaction.user.id, 
                    beforeDelete: 600, 
                    jobs: [], 
                    jobsReserve: availableJobs,
                    worker_count: 1,
                    workers: []
                }
                var buttons = createButtonRow(newVacancy.jobs, newVacancy.jobsReserve, interaction.customId)
                message = await channel.send({content: `<@${interaction.user.id}>, вакансия сформирована!`, components: [buttons], embeds: [embed]})
                vacancyInfo.vacancyCount++
                fs.writeFileSync('./vacancy-info.json', JSON.stringify(vacancyInfo))
                vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
                vacancies.push(newVacancy)
                fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
                getMsgId(message.id, vacancyInfo.vacancyCount - 1)
                var userFounded = false
                for(var i = 0; i < users.length; i++){
                    target_user = users[i]
                    if(interaction.user.id == target_user.id){
                        target_user.cooldown = 1800
                        userFounded = true
                    }
                }
                if(userFounded == false){
                    users.push({id: interaction.user.id, cooldown: 1800})
                }
                fs.writeFileSync('./users.json', JSON.stringify(users, null, 2))
                log = `${dt.getHours()}:${dt.getMinutes()} Создана новая вакансия №${newVacancy.vacancyNum}!`
            }
            
        }
        if(interaction.customId === 'take-vacancy'){
            var row = new MessageActionRow().addComponents([new MessageButton().setCustomId('take-vacancy').setLabel('Взять вакансию').setStyle('DANGER').setDisabled(true)])
            const row2 = new MessageActionRow().addComponents([
                new MessageButton().setCustomId('untake-vacancy').setLabel('Отказаться от вакансии').setStyle('DANGER')
            ])
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            vacancyCount = parseInt(interaction.message.embeds[0].title.substring(10))
            target_vacancy = vacancies[vacancyCount]
            if(target_vacancy.workers.length < target_vacancy.worker_count){
                log = `${dt.getHours()}:${dt.getMinutes()} ${interaction.user.username} Взял вакансию №${vacancyCount}.`
                if(target_vacancy.workers.length != 0){
                    for(var worker of target_vacancy.workers){
                        if(worker[0] == interaction.user.id){
                            return
                        }
                    }
                }
                var channel = interaction.guild.channels.cache.get(`${target_vacancy.vacancyChannel}`)
                channel.permissionOverwrites.create(interaction.user.id, {
                    'VIEW_CHANNEL': true
                })
                var message
                if(target_vacancy.worker_count == 1){
                    message = await channel.send({content: `**<@${target_vacancy.dealerId}>, на вашу вакансию откликнулся <@${interaction.user.id}>.**\nЧтобы отказаться от вакансии, нажмите:`, components: [row2]})
                    target_vacancy.workers.push([`${interaction.user.id}`, message.id])
                }
                else if(target_vacancy.worker_count > 1){
                    message = await channel.send({content: `**<@${target_vacancy.dealerId}>, на вашу вакансию откликнулся <@${interaction.user.id}>.**`})
                    target_vacancy.workers.push([`${interaction.user.id}`, message.id])
                    workers_list = createWorkersList(target_vacancy.workers)
                    channel.messages.fetch(target_vacancy.workers_list_message).then(msg => msg.edit({content: workers_list, components: [msg.components[0]]}))
                }
                fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
                if(target_vacancy.workers.length < target_vacancy.worker_count) interaction.deferUpdate()
                if(target_vacancy.workers.length == parseInt(target_vacancy.worker_count)){
                    interaction.update({
                        content: interaction.message.content,
                        components: [row],
                        embeds: [interaction.message.embeds[0]]})
                }
            }
        }
        if(interaction.customId === 'untake-vacancy'){
            interaction.deferUpdate()
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            vacancyCount = interaction.channel.name.substring(9)
            target_vacancy = vacancies[vacancyCount]
            for(var worker of target_vacancy.workers){
                if(worker[0] == interaction.user.id){
                    log = `${dt.getHours()}:${dt.getMinutes()} ${interaction.user.username} Взял вакансию №${vacancyCount}.`
                    interaction.channel.messages.fetch(worker[1]).then(msg => msg.delete())
                    interaction.channel.permissionOverwrites.delete(interaction.user)
                    var channel = interaction.guild.channels.cache.get(`${target_vacancy.vacancyNotificChannel}`)
                    target_vacancy.workers = target_vacancy.workers.filter(value => {if(value[0] != interaction.user.id) return value})
                    if(target_vacancy.workers.length < target_vacancy.worker_count){
                        channel.messages.fetch(target_vacancy.vacancyNotific).then(msg => {
                            const embed = msg.embeds[0]
                            const row = new MessageActionRow().addComponents([new MessageButton().setCustomId('take-vacancy').setLabel('Взять вакансию').setStyle('SUCCESS')])
                            msg.edit({embeds: [embed], components: [row]})
                        })
                    }
                    if(target_vacancy.worker_count > 1){
                        workers_list = createWorkersList(target_vacancy.workers)
                        interaction.channel.messages.fetch(target_vacancy.workers_list_message).then(msg => msg.edit({content: workers_list, components: [msg.components[0]]}))
                    }
                    fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
                }
            }
        }
        if(interaction.customId === 'end-vacancy'){
            vacancyCount = parseInt(interaction.channel.name.substring(9))
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            target_vacancy = vacancies[vacancyCount]
            if(target_vacancy.vacancyNotific != ''){
                target_vacancy.beforeDelete = 600
                interaction.channel.send({
                    content: 'Вакансия закрыта! Данный чат удалиться через 10 минут.'
                })
                const channel2 = client.channels.cache.get(`${target_vacancy.vacancyNotificChannel}`);
                message = channel2.messages.fetch(`${target_vacancy.vacancyNotific}`).then(msg => msg.delete())
                target_vacancy.vacancyNotific = ''
                fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
                const row = new MessageActionRow().addComponents([
                    new MessageButton().setCustomId('end-vacancy').setLabel('Отменить вакансию').setStyle('DANGER').setDisabled(true)
                ])
                const row2 = new MessageActionRow().addComponents([
                    new MessageButton().setCustomId('untake-vacancy').setLabel('Отказаться от вакансии').setStyle('DANGER').setDisabled(true)
                ])
                interaction.update({content: interaction.message.content, components: [row], embeds: [interaction.message.embeds[0]]})
                if(target_vacancy.worker_count > 1){
                    interaction.channel.messages.fetch(target_vacancy.workers_list_message).then(msg => {msg.edit({content: msg.content, components: [row2]})})
                }
                if(target_vacancy.worker_count == 1 && target_vacancy.workers.length == 1){
                    interaction.channel.messages.fetch(target_vacancy.workers[0][1]).then(msg => {msg.edit({content: msg.content, components: [row2]})})
                }
                log = `${dt.getHours()}:${dt.getMinutes()} ${interaction.user.username} Закрыл вакансию №${vacancyCount}.`
            }
            
        }
        if(interaction.customId === 'add-contract'){
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            vacancyCount = parseInt(interaction.channel.name.substring(9))
            target_vacancy = vacancies[vacancyCount]
            var jobgivers = JSON.parse(fs.readFileSync('./jobgivers.json', 'utf-8'))
            var target_jobgiver = jobgivers.filter(value => {
               if(interaction.user.id == value.id){
                   return true
               }
            })[0]
            var buttons = []
            if(target_vacancy.jobsReserve.length > 0){
                for(var i = 0; i < target_vacancy.jobsReserve.length; i++){
                    job = target_vacancy.jobsReserve[i]
                    buttons.push(new MessageButton().setCustomId(job[1]).setLabel(job[0]).setStyle('PRIMARY'))
                }
                interaction.update({content: interaction.message.content, embeds: [interaction.message.embeds[0]], components: [vacancyInfoButtons]})
                const row = new MessageActionRow().addComponents([buttons])
                interaction.channel.send({content: 'Выберите контракт, который вы хотите добавить в вакансию:', components: [row]})
            }
        }
        if(interaction.customId === 'delete-contract'){
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            vacancyCount = parseInt(interaction.channel.name.substring(9))
            target_vacancy = vacancies[vacancyCount]
            var buttons = []
            for(var i = 0; i < target_vacancy.jobs.length; i++){
                job = target_vacancy.jobs[i]
                buttons.push(new MessageButton().setCustomId('remove-'+job[2]).setLabel(job[0]).setStyle('PRIMARY'))
            }
            const row = new MessageActionRow().addComponents([buttons])
            interaction.update({content: interaction.message.content, embeds: [interaction.message.embeds[0]], components: [vacancyInfoButtons]})
            interaction.channel.send({content: 'Выберите контракт, который хотите удалить из вакансии:', components: [row]})
        }
        if(interaction.customId === 'cancel'){
            interaction.message.delete()
        }
        if(interaction.customId === 'public-vacancy'){
            vacancyCount = parseInt(interaction.channel.name.substring(9))
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            target_vacancy = vacancies[vacancyCount]
            embed = interaction.message.embeds[0]
            target_vacancy.beforeDelete = 85000
            log = `${dt.getHours()}:${dt.getMinutes()} ${interaction.user.username} Опубликовал вакансию №${vacancyCount}.`
            fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
            const row = new MessageActionRow().addComponents([
                new MessageButton().setCustomId('take-vacancy').setLabel('Взять вакансию').setStyle('SUCCESS')
            ])
            const row2 = new MessageActionRow().addComponents([
                new MessageButton().setCustomId('end-vacancy').setLabel('Отменить вакансию').setStyle('DANGER'),
                new MessageButton().setCustomId('end-meeting').setLabel('Закончить набор').setStyle('DANGER'),
            ])
            const row3 = new MessageActionRow().addComponents([
                new MessageButton().setCustomId('untake-vacancy').setLabel('Отказаться от вакансии').setStyle('DANGER')
            ])
            const row4 = new MessageActionRow().addComponents([
                new MessageButton().setCustomId('end-vacancy').setLabel('Отменить вакансию').setStyle('DANGER')
            ])
            channel = interaction.guild.channels.cache.get(`968747438875754527`)
            channel.send({content: `Новая вакансия от ${interaction.user.username}`, embeds: [embed], components: [row]}).then(msg => addIDsToVacancy(msg.id, msg.channel.id, vacancyCount))
            if(target_vacancy.worker_count > 1) interaction.update({content: interaction.message.content, embeds: [interaction.message.embeds[0]], components: [row2]})
            if(target_vacancy.worker_count == 1) interaction.update({content: interaction.message.content, embeds: [interaction.message.embeds[0]], components: [row4]})
            if(target_vacancy.worker_count > 1){
                vacancyWorkers = await interaction.channel.send({content: 'Набор открыт! Список отозвавшихся на вакансию работников:\n-', components: [row3]}).then(msg => getMsgId3(msg.id, vacancyCount))
            }
        }
        if(interaction.customId === 'schoose-worker-count'){
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            vacancyCount = parseInt(interaction.channel.name.substring(9))
            target_vacancy = vacancies[vacancyCount]
            const row2 = new MessageActionRow().addComponents([
                new MessageSelectMenu().setCustomId('schoose-worker-count-select').addOptions(
                    {
                        label: "1",
                        value: "1"
                    },
                    {
                        label: "2",
                        value: "2"
                    },
                    {
                        label: "3",
                        value: "3"
                    },
                    {
                        label: "4",
                        value: "4"
                    },
                    {
                        label: "5",
                        value: "5"
                    }
                ).setPlaceholder('Выберите кол-во..')
            ])
            channel = interaction.guild.channels.cache.get(target_vacancy.vacancyChannel)
            channel.send({
                content: 'Выберите количество работников, которое вам требуется:',
                components: [row2]
            })
            interaction.update({content: interaction.message.content, components: [vacancyInfoButtons], embeds: [interaction.message.embeds[0]]})

        }
        if(interaction.customId === 'end-meeting'){
            const row = new MessageActionRow().addComponents([
                new MessageButton().setCustomId('take-vacancy').setLabel('Взять вакансию').setStyle('DANGER').setDisabled(true)
            ])
            const row2 = new MessageActionRow().addComponents([
                new MessageButton().setCustomId('end-vacancy').setLabel('Отменить вакансию').setStyle('DANGER'),
                new MessageButton().setCustomId('end-meeting').setLabel('Закончить сбор').setStyle('DANGER').setDisabled(true),
            ])
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            vacancyCount = parseInt(interaction.channel.name.substring(9))
            target_vacancy = vacancies[vacancyCount]
            if(interaction.user.id == target_vacancy.dealerId){
                channel = client.channels.cache.get(target_vacancy.vacancyNotificChannel)
                channel.messages.fetch(target_vacancy.vacancyNotific).then(msg => msg.edit({content: msg.content, components: [row], embeds: [msg.embeds[0]]}))
                interaction.update({content: interaction.message.content, components: [row2], embeds: [interaction.message.embeds[0]]})
                interaction.channel.messages.fetch(target_vacancy.workers_list_message).then(msg => {
                    tempstr = msg.content.substring(13)
                    result = `Набор закрыт!${tempstr}`
                    msg.edit({content: result, components: [msg.components[0]]})
                })
                log = `${dt.getHours()}:${dt.getMinutes()} ${interaction.user.username} Закончил набор в вакансию №${vacancyCount}.`
            }
        }
        if(interaction.customId.startsWith('remove')){
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            prices = JSON.parse(fs.readFileSync('./prices.json', 'utf-8'))
            vacancyCount = interaction.channel.name.substring(9)
            target_vacancy = vacancies[vacancyCount]
            var toReserve
            target_vacancy.jobs = target_vacancy.jobs.filter((value, index, arr) => {

                if(interaction.customId.substring(7) == value[2]){
                    toReserve = value
                }
                else{
                    return value
                }
            })
            target_vacancy.jobsReserve.push([toReserve[0], toReserve[2]])
            const embed = createEmbed(target_vacancy)
            buttons = createButtonRow(target_vacancy.jobs, target_vacancy.jobsReserve, interaction.customId)
            interaction.channel.messages.fetch(target_vacancy.vacancyInfoMessage).then(msg => {
                msg.edit({content: msg.content, embeds: [embed], components: [buttons]})
            })
            interaction.message.delete()
            fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
            log = `${dt.getHours()}:${dt.getMinutes()} ${interaction.user.username} удалил контракт ${toReserve[0]} из вакансии №${vacancyCount}.`
        }
        if(interaction.customId.startsWith('contract')){
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            prices = JSON.parse(fs.readFileSync('./prices.json', 'utf-8'))
            vacancyCount = interaction.channel.name.substring(9)
            target_vacancy = vacancies[vacancyCount]
            var contract
            if(interaction.customId == 'contract-meal'){
                contract = 'Мясной день'
                prices = prices.mealORtrash
            }
            if(interaction.customId == 'contract-trash'){
                contract = 'Гранд. уборка'
                prices = prices.mealORtrash
            }
            if(interaction.customId == 'contract-sewing'){
                contract = 'Обновляем гардероб'
                prices = prices.schemeORsveika
            }
            if(interaction.customId == 'contract-schemes'){
                contract = 'Долгожд. встреча'
                prices = prices.schemeORsveika
            }
            if(interaction.customId == 'contract-volunteer'){
                contract = 'Мотивир. волонтёрство'
                prices = prices.vstrecaORvolonterstvo
            }
            if(interaction.customId == 'contract-badway'){
                contract = 'Скользк. дорожка'
                prices = prices.vstrecaORvolonterstvo
            }
            const selectSalary = new MessageActionRow().addComponents([
                new MessageSelectMenu().setCustomId('select-salary').setPlaceholder('Выберите оплату').setOptions(prices)
            ])
            interaction.update({components: [selectSalary], content: `Пожалуйста, выберите оплату за контракт "${contract}":`})
            fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
        }
    }
    if(interaction.isSelectMenu()){
        if(interaction.customId === 'select-salary'){
            try{
                var salary = interaction.values[0]
                vacancyCount = interaction.channel.name.substring(9)
                vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
                target_vacancy = vacancies[vacancyCount]
                contract = interaction.message.content.slice(41, -2)
                var customId
                newJob = [contract, salary]
                target_vacancy.jobsReserve = target_vacancy.jobsReserve.filter((value, index, arr) => {
                    if(value[0] == newJob[0]){
                        customId = value[1]
                    }
                    if(value[0] != newJob[0]) {
                        return value
                    }
                })
                newJob.push(customId)
                target_vacancy.jobs.push(newJob)
                fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
                const embed = createEmbed(target_vacancy)
                buttons = createButtonRow(target_vacancy.jobs, target_vacancy.jobsReserve, interaction.customId)
                interaction.channel.messages.fetch(target_vacancy.vacancyInfoMessage).then(msg => {
                    msg.edit({content: msg.content, embeds: [embed], components: [buttons]})
                })
                interaction.message.delete()
                log = `${dt.getHours()}:${dt.getMinutes()} ${interaction.user.username} выбрал оплату за контракт (${salary}) для вакансии №${vacancyCount}.`
            }
            catch(err){
                console.log(err)
            }
        }
        if(interaction.customId === 'schoose-worker-count-select'){
            vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
            vacancyCount = interaction.channel.name.substring(9)
            target_vacancy = vacancies[vacancyCount]
            target_vacancy.worker_count = interaction.values[0]
            fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
            channel = interaction.guild.channels.cache.get(target_vacancy.vacancyChannel)
            buttons = createButtonRow(target_vacancy.jobs, target_vacancy.jobsReserve, interaction.customId)
            channel.messages.fetch(target_vacancy.vacancyInfoMessage).then(msg => {
                msg.edit({
                    content: msg.content,
                    components: [buttons],
                    embeds: [msg.embeds[0]]
                })
            })
            interaction.message.delete()
            log = `${dt.getHours()}:${dt.getMinutes()} ${interaction.user.username} выбрал количество работников (${target_vacancy.worker_count}) для вакансии №${vacancyCount}.`
        }
    }
    console.log(log)
} )

function createEmbed(vacancy){
    contracts = ''
    salary = ''
    var minutes = 0
    var hours = 0
    var endSalary = 0
    for(var element of vacancy.jobs){
        contracts += `${element[0]}\n`
        salary += `${element[1]}\n`
        endSalary += parseInt(element[1].substring(1))
        switch(element[0]){
            case "Мясной день":
                hours += 1
                minutes += 30
                break
            case "Гранд. уборка":
                hours += 2
                break
            case "Обновляем гардероб":
                minutes += 10
                break
            case "Долгожд. встреча":
                minutes += 10
                break
            case "Мотивир. волонтёрство":
                minutes += 5
                break
            case "Скользк. дорожка":
                minutes += 5
                break
        }
    }
    if(contracts == '') contracts = '-'
    if(salary == '') salary = '-'
    totalTime = `Примерно ${minutes} минут`
    if(hours>0) totalTime = `Примерно ${hours}ч. ${minutes}мин.`
    const embed = new MessageEmbed().setTitle(`Вакансия №${vacancy.vacancyNum}`).setFields(
        {name: 'Контракт:', value: contracts, inline: true},
        {name: '\u200B', value: '\u200B', inline: true},
        {name: 'Оплата:', value: `${salary}`, inline: true},
        {name: '\u200B', value: '\u200B'},
        {name: 'Время выполнения:', value: totalTime, inline: true},
        {name: 'Итоговая оплата:', value: `$${endSalary}.000`, inline: true},
    )
    return embed
}

function createWorkersList(workers_list){
    var result
    if(workers_list.length != 0){
        result = 'Набор открыт! Список отозвавшихся на вакансию работников:\n'
        for(var worker of workers_list){
            result += `<@${worker[0]}>\n`
        }
    }
    else{
        result = 'Набор открыт! Список отозвавшихся на вакансию работников:\n-'
    }
    return result
}

function createButtonRow(jobs, jobsReserve, customId){
    var row = new MessageActionRow().addComponents([
        new MessageButton()
            .setCustomId('add-contract')
            .setLabel('Добавить контракт')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('delete-contract')
            .setLabel('Удалить контракт')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('schoose-worker-count')
            .setLabel('Кол-во работников')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('public-vacancy')
            .setLabel('Опубликовать вакансию')
            .setStyle('SUCCESS'),
    ])
    if(customId == 'add-contracts' || customId == 'delete-contracts'){
        row.components[0].setDisabled(true)
        row.components[1].setDisabled(true)
        row.components[2].setDisabled(true)
        row.components[3].setDisabled(true)
        return row
    }
    if(jobs.length == 0){
        row.components[1].setDisabled(true)
        row.components[2].setDisabled(true)
        row.components[3].setDisabled(true)
        return row
    }
    else if(jobs.length > 0 && jobsReserve.length > 0){
        row.components[1].setDisabled(false)
        row.components[2].setDisabled(false)
        row.components[3].setDisabled(false)
        return row
    }
    else if(jobs.length > 0 && jobsReserve.length == 0){
        row.components[0].setDisabled(true)
        row.components[2].setDisabled(false)
        row.components[3].setDisabled(false)
        return row
    }
    return row
}

function addIDsToVacancy(msgId, channelId, vacancyCount){
    vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
    vacancies[vacancyCount].vacancyNotific = msgId
    vacancies[vacancyCount].vacancyNotificChannel = channelId
    fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
}

function getMsgId(messageId, vacancyCount){
    vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
    vacancies[vacancyCount].vacancyInfoMessage = messageId
    fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
}

function getMsgId2(messageId, vacancyCount){
    vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
    vacancies[vacancyCount].vacancyTaked = messageId
    fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
}

function getMsgId3(messageId, vacancyCount){
    vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
    vacancies[vacancyCount].workers_list_message = messageId
    fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
}

client.on('ready', async () => {
    const row = new MessageActionRow().addComponents([
        new MessageButton().setCustomId('new-vacancy').setLabel('Создать вакансию').setStyle('PRIMARY')
    ])
    const embed = new MessageEmbed().setTitle('Test').setImage('https://i.imgur.com/549qHPg.png')
            .addFields(
                {name: 'Багажник:', value: '200 кг (22 мяса)\n\u200B', inline: true}, 
                {name: 'Скорость:', value: '280 км/ч', inline: true},
                {name: 'Усреднённые расценки:', value: '1 час - $4.500\n1.5 часа - $6.000\n2 часа - $8.000\n3 часа - $10.000\nДо рестарта - договорная'},
                )
    var channel = client.channels.cache.get('969512049493303306');
})

client.on('ready', async () => {
    setInterval( () => {
        vacancies = JSON.parse(fs.readFileSync('./vacancies.json', 'utf-8'))
        for(var i = 0; i < vacancies.length; i++){
            try{
                target_vacancy = vacancies[i]
                if(target_vacancy.ended == false){
                    if(target_vacancy.beforeDelete <= 0){
                        var guild = client.guilds.cache.get('968060632928763985')
                        var channel = guild.channels.cache.get(`${target_vacancy.vacancyChannel}`)
                        if(channel != undefined) channel.delete()
                        target_vacancy.ended = true
                        if(target_vacancy.vacancyNotific != ''){
                            var channel2 = client.channels.cache.get(target_vacancy.vacancyNotificChannel);
                            if(channel2 != undefined) channel2.messages.fetch(target_vacancy.vacancyNotific).then(msg => {if(msg != undefined) msg.delete()})
                        }
                    }
                    else {target_vacancy.beforeDelete -= 1}
                }
            }
            catch(err) {console.log(err)}
        }
        fs.writeFileSync('./vacancies.json', JSON.stringify(vacancies, null, 2))
    }, 1000);
})

/* client.on('ready', () => {
    setInterval(() => {
        try{
            users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'))
            for(var i = 0; i < users.users.length; i++){
                target_user = users.users[i]
                if(target_user.cooldown > 0){
                    target_user.cooldown -= 1
                }
            }
            fs.writeFileSync('./users.json', JSON.stringify(users, null, 2))
        }
        catch(err){
            console.log(err)
        }
    }, 1000); 
}) */

client.on('ready', async () => {
    channel = client.channels.cache.get('969512049493303306')
})

client.login('bot-token')

