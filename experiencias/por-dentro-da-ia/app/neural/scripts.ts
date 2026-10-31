export interface StageMeta {
  number: number;
  name: string;
  title: string;
  badge: string;
  hint: string;
}

export const STAGES: Record<number, StageMeta> = {
  1: {
    number: 1,
    name: "construção",
    title: "Construa a rede",
    badge: "construção",
    hint: "Rede construída — siga para a passagem direta.",
  },
  2: {
    number: 2,
    name: "passagem direta",
    title: "Faça a passagem direta",
    badge: "passagem direta",
    hint: "Passagem direta concluída — siga para a retropropagação.",
  },
  3: {
    number: 3,
    name: "retropropagação",
    title: "Retropropague o erro",
    badge: "retropropagação",
    hint: "Gradientes prontos — siga para a atualização dos pesos.",
  },
  4: {
    number: 4,
    name: "atualização",
    title: "Atualize os pesos",
    badge: "descida do gradiente",
    hint: "Pesos atualizados — siga para o treino e a previsão.",
  },
  5: {
    number: 5,
    name: "treino",
    title: "Treine e preveja",
    badge: "treino",
    hint: "Tour concluído — a rede treinou e previu todas as amostras.",
  },
};

export const DEFAULT_SCRIPTS: Record<number, string> = {
  1: `# etapa 1 — construa a rede
# Edite o que quiser abaixo e execute.

# cada linha é uma casa: [luz acesa, porta aberta]
X = Features([[0, 0], [0, 1], [1, 0], [1, 1]])
# 0 = travessura, 1 = gostosura
y = Labels([0, 1, 1, 0])

# a rede em si: 2 entradas -> 3 neurônios ocultos -> 1 saída
nn = NeuralNetwork([2, 3, 1],
                   hidden="relu",
                   output="tanh",
                   init="xavier",
                   seed=42)`,
  2: `# etapa 2 — passagem direta, na rede construída na etapa 1
# Cada linha executada é destacada e o painel de matrizes mostra
# a multiplicação que aquela linha acabou de fazer.

# comece com a amostra 0: os valores de entrada entram na rede
I0 = X[0]

# uma chamada nn.forward(valor, camada) por camada (esta rede tem duas).
I1 = nn.forward(I0, 1)   # camada oculta: I0·W + B, depois relu
I2 = nn.forward(I1, 2)   # camada de saída: I1·W + B, depois tanh`,
  3: `# etapa 3 — retropropagação: o erro flui da direita para a esquerda
# A passagem direta da etapa 2 continua guardada na rede.
# Nenhuma chamada de forward aqui: comece na saída e caminhe para a esquerda.

d2 = nn.backward(y[0], 2)   # camada de saída: perda, δ e gradientes
d1 = nn.backward(d2, 1)     # camada oculta: δ e gradientes`,
  4: `# etapa 4 — aplique os gradientes da etapa 3
# A passagem de volta deixou ∂L/∂W e ∂L/∂b na rede; reuse-os aqui.
# A atualização dá um passo pequeno CONTRA o gradiente:
#     W ← W − lr · ∂L/∂W        B ← B − lr · ∂L/∂b

nn.update_weights(0.5, 2, nn.gradient(2))   # camada de saída
nn.update_weights(0.5, 1, nn.gradient(1))   # camada oculta`,
  5: `# etapa 5 — a viagem inteira em um script
# Reconstrua os dados e uma rede nova, e deixe o treino fazer o laço
# de ida + volta + atualização para você, época após época.

# cada linha é uma casa: [luz acesa, porta aberta]
X = Features([[0, 0], [0, 1], [1, 0], [1, 1]])
# 0 = travessura, 1 = gostosura
y = Labels([0, 1, 1, 0])

nn = NeuralNetwork([2, 3, 1],
                   hidden="relu",
                   output="tanh",
                   init="xavier",
                   seed=42)

loss = nn.train(X, y,
                epochs=800,
                learning_rate=0.5,
                momentum=0.1)

# O gráfico mostra a perda em cada época e a acurácia final.
# Preveja cada amostra com a rede treinada:
P = nn.predict(X)`,
};

export function stageTitle(stage: number) {
  return STAGES[stage]?.title ?? String(stage);
}

export function stageName(stage: number) {
  return STAGES[stage]?.name ?? String(stage);
}
