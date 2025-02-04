require("dotenv").config();
const venom = require("venom-bot");
const axios = require("axios");
const banco = require("./src/banco");
const faqData = require("./src/faq_data.json");

const treinamento = 'Você é um assistente virtual de uma loja de veículos novos e seminovos, sua função será responder mensagens de WhatsApp de potenciais clientes.';

venom.create({
    session: "chatGPT_bot",
    multidevice: true,
    headless: true,
    executablePath: "chrome-headless-shell@132.0.6834.159 C:\Users\Beatriz\Documents\chatbot_2\chrome-headless-shell\win64-132.0.6834.159\chrome-headless-shell-win64\chrome-headless-shell.exe"
})
.then((client) => start(client))
.catch((err) => console.log(err));

const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
};

const start = (client) => {
    client.onMessage((message) => {
        if (message.from === 'status@broadcast') {
            return;
        }

        const userCadastrado = banco.db.find(numero => numero.num === message.from);

        if (!userCadastrado) {
            console.log("Cadastrando usuário");
            banco.db.push({ num: message.from, historico: [] });
        } else {
            console.log("Usuário já cadastrado");
        }

        const historico = banco.db.find(num => num.num === message.from);
        historico.historico.push("user: " + message.body);
        console.log(historico.historico);
        console.log(banco.db);

        const faqContent = faqData.faq.map(item => `Pergunta: ${item.pergunta}\nResposta: ${item.resposta}`).join("\n\n");
        const lojaInfo = `
            Nome da loja: ${faqData.loja.nome}
            Endereço: ${faqData.loja.endereco}
            Horário de funcionamento: ${faqData.loja.horario}
            Estoque online: ${faqData.loja.estoqueOnline}
            Formas de pagamento: ${faqData.loja.formasPagamento}
            Aceita troca de veículos: ${faqData.loja.aceitaTroca}
        `;

        axios.post("https://api.openai.com/v1/chat/completions", {
            "model": "gpt-4o-mini",
            "messages": [
                { "role": "system", "content": treinamento },
                { "role": "system", "content": "Informações sobre a loja:\n" + lojaInfo },
                { "role": "system", "content": "FAQ da loja:\n" + faqContent },
                { "role": "system", "content": "Histórico de conversas: " + historico.historico },
                { "role": "user", "content": message.body }
            ]
        }, {
            headers: header
        })
        .then((response) => {
            console.log(response.data.choices[0].message.content);
            historico.historico.push("assistant: " + response.data.choices[0].message.content);
            client.sendText(message.from, response.data.choices[0].message.content);
        })
        .catch((err) => {
            console.log(err);
        });
    });
};
