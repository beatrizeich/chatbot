const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = "https://gustavoveiculosstm.com.br/wp-json/wp/v2/veiculos?per_page=100&page=";
const JSON_PATH = path.join(__dirname, "veiculos_data.json");

// Função para buscar todos os veículos e salvar em um arquivo JSON
const atualizarVeiculos = async () => {
    let veiculos = [];
    let page = 1;
    let hasMore = true;

    console.log("Atualizando dados dos veículos...");

    while (hasMore) {
        try {
            const response = await axios.get(`${API_URL}${page}`);
            veiculos = [...veiculos, ...response.data];
            hasMore = response.data.length === 100; // Se a página tem 100 itens, pode haver mais
            page++;
        } catch (error) {
            console.error("Erro ao buscar veículos:", error);
            hasMore = false;
        }
    }

    // Salva os dados no arquivo JSON
    fs.writeFileSync(JSON_PATH, JSON.stringify(veiculos, null, 2), "utf8");
    console.log("Dados dos veículos atualizados com sucesso!");
};

// Executar a função se o script for rodado diretamente
if (require.main === module) {
    atualizarVeiculos();
}

// Exportar a função para que possa ser chamada de outros arquivos
module.exports = { atualizarVeiculos };
