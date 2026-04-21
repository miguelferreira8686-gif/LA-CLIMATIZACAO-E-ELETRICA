// FIREBASE
var firebaseConfig = {
  databaseURL: "https://la-climatizacao-e-eletrica-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.database();

let pedidos = {};
let gastos = {};
let editandoId = null;

db.ref("pedidos").on("value", snapshot => {
  pedidos = snapshot.val() || {};
  atualizar();
});

db.ref("gastos").on("value", snapshot => {
  gastos = snapshot.val() || {};
  atualizar();
});

function formatarData(data) {
  if (!data) return "";
  return new Date(data).toLocaleDateString("pt-BR");
}

function addPedido() {
  let cliente = document.getElementById("cliente").value;
  let servico = document.getElementById("servico").value;
  let valor = parseFloat(document.getElementById("valorPedido").value);
  let responsavel = document.getElementById("responsavel").value;
  let status = document.getElementById("status").value;
  let data = document.getElementById("dataPedido").value;

  if (!cliente || !valor) return;

  if (editandoId) {
    db.ref("pedidos/" + editandoId).update({
      cliente, servico, valor, responsavel, status, data
    });
    editandoId = null;
    document.getElementById("btnPedido").innerText = "Adicionar Pedido";
  } else {
    db.ref("pedidos").push({
      cliente, servico, valor, responsavel, status, data
    });
  }

  limparCampos();
}

function editarPedido(id) {
  let p = pedidos[id];

  document.getElementById("cliente").value = p.cliente;
  document.getElementById("servico").value = p.servico;
  document.getElementById("valorPedido").value = p.valor;
  document.getElementById("responsavel").value = p.responsavel;
  document.getElementById("status").value = p.status;
  document.getElementById("dataPedido").value = p.data;

  editandoId = id;
  document.getElementById("btnPedido").innerText = "Salvar Edição";
}

function deletarPedido(id) {
  if (confirm("Deseja excluir esse serviço?")) {
    db.ref("pedidos/" + id).remove();
  }
}

function limparCampos() {
  document.getElementById("cliente").value = "";
  document.getElementById("servico").value = "";
  document.getElementById("valorPedido").value = "";
  document.getElementById("dataPedido").value = "";
}

function addGasto() {
  let desc = document.getElementById("descGasto").value;
  let valor = parseFloat(document.getElementById("valorGasto").value);
  let quem = document.getElementById("quemPagou").value;
  let data = document.getElementById("dataGasto").value;

  if (!desc || !valor) return;

  db.ref("gastos").push({
    desc, valor, quem, data
  });
}

function atualizar() {

  let listaPedidos = document.getElementById("listaPedidos");
  let listaGastos = document.getElementById("listaGastos");

  listaPedidos.innerHTML = "";
  listaGastos.innerHTML = "";

  let totalFat = 0;
  let totalGasto = 0;
  let antonio = 0;
  let lucas = 0;

  for (let id in pedidos) {
    let p = pedidos[id];

    if (p.status === "Pago") {
      totalFat += p.valor;
      if (p.responsavel === "Antônio") antonio += p.valor;
      else lucas += p.valor;
    }

    listaPedidos.innerHTML += `
      <li>
      <b>${p.cliente}</b> | ${p.servico}<br>
      R$${p.valor} | ${p.responsavel} | ${p.status}<br>
      📅 ${formatarData(p.data)}<br>

      <button onclick="editarPedido('${id}')">Editar</button>
      <button onclick="deletarPedido('${id}')">Excluir</button>
      </li>
    `;
  }

  for (let id in gastos) {
    let g = gastos[id];

    totalGasto += g.valor;

    if (g.quem === "Antônio") antonio -= g.valor;
    else lucas -= g.valor;

    listaGastos.innerHTML += `
      <li>
      ${g.desc} - R$${g.valor}<br>
      ${g.quem} | 📅 ${formatarData(g.data)}
      </li>
    `;
  }

  document.getElementById("fat").innerText = totalFat.toFixed(2);
  document.getElementById("gasto").innerText = totalGasto.toFixed(2);
  document.getElementById("liq").innerText = (totalFat - totalGasto).toFixed(2);
  document.getElementById("antonio").innerText = antonio.toFixed(2);
  document.getElementById("lucas").innerText = lucas.toFixed(2);
}

function pesquisar() {
  let nome = document.getElementById("buscaCliente").value.toLowerCase();
  let data = document.getElementById("buscaData").value;

  let resultado = document.getElementById("resultadoBusca");
  resultado.innerHTML = "";

  for (let id in pedidos) {
    let p = pedidos[id];

    if (
      p.status === "Pago" &&
      (p.cliente.toLowerCase().includes(nome) || !nome) &&
      (p.data === data || !data)
    ) {
      resultado.innerHTML += `
        <li>
        <b>${p.cliente}</b> | ${p.servico}<br>
        R$${p.valor} | ${p.responsavel}<br>
        📅 ${formatarData(p.data)}
        </li>
      `;
    }
  }
}
