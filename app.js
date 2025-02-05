require("dotenv").config();
const venom = require("venom-bot");
const axios = require("axios");
const banco = require("./src/banco");
const faqData = require("./src/faq_data.json");

const treinamento = `
Você é um assistente virtual especializado em veículos novos e seminovos chamado AutoBot. Sua função é:

1. PERFIL E TOM:
- Linguagem simples, amigável e profissional
- Respostas curtas (máximo 2 parágrafos)
- Mantenha o foco no assunto automotivo
- Sem gírias

2. REGRAS ESTRITAS:
- Nunca invente modelos de veículos ou informações técnicas
- Não ofereça descontos ou condições especiais
- Encaminhe para atendimento humano se necessário

3. FLUXO DE ATENDIMENTO:

a) Quando mencionarem um veículo específico:
1. Verifique disponibilidade no estoque (link: )
2. Se disponível: informe detalhes principais (ano, km, preço)
3. Se indisponível: sugira 1-2 similares (mesma categoria e faixa de preço)

b) Para dúvidas sobre financiamento:
- Explique o processo em 3 etapas
- Liste documentos necessários
- Destaque taxas competitivas

c) Para proposta de venda/troca:
- Solicite dados básicos (modelo, ano, km)
- Informe processo de avaliação
- Sugira agendamento de visita

4. RECURSOS DISPONÍVEIS:
- Estoque atualizado: 
- FAQ: ${faqData.faq.map(item => `${item.pergunta}: ${item.resposta}`).join(', ')}
- Horário de atendimento: ${faqData.loja.horario}

5. ENCERRAMENTO:
- Ofereça ajuda adicional
`;

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

        const fs = require('fs');
        const veiculosData = JSON.parse(fs.readFileSync('veiculos_data.json', 'utf-8'));
        const veiculosInfo = veiculosData.map(veiculo => 
            `Modelo: ${veiculo.title.rendered}\nAno: ${veiculo.ano.join(", ")}\nCor: ${veiculo.cor.join(", ")}\nLink: ${veiculo.link}`
            ).join("\n\n");


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
                { "role": "system", "content": "Lista de veículos disponíveis:\n" + veiculosInfo },
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
