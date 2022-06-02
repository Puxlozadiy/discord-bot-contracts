module.exports = identifier => {
    targetJob = []
    switch(identifier){
        case '%F0%9F%A5%A9':
            targetJob = ["Мясной день", "contract-meal"]
            break
        case '%F0%9F%A7%B9':
            targetJob = ["Гранд. уборка", "contract-trash"]
            break
        case '%F0%9F%AA%A1':
            targetJob = ["Обновляем градероб", "contract-sewing"]
            break
        case '%F0%9F%93%9F':
            targetJob = ["Долгожд. встреча", "contract-schemes"]
            break
        case '%F0%9F%91%B2':
            targetJob = ["Мотивир. волонтёрство", "contract-volunteer"]
            break
        case '%F0%9F%95%B5%EF%B8%8F':
            targetJob = ["Скользк. дорожка", "contract-badway"]
            break
    }
    return targetJob
}