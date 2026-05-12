# Instruções para Publicação no GitHub

Execute os comandos abaixo no seu terminal (dentro da pasta do projeto) para conectar o ambiente local ao repositório remoto e subir o código:

```bash
# 1. Adicionar o repositório remoto
git remote add origin https://github.com/Raivcx/megaloko.git

# 2. Definir a branch principal como 'main'
git branch -M main

# 3. Fazer o push para o GitHub
git push -u origin main
```

> [!TIP]
> Se o repositório remoto já contiver arquivos (como um README ou LICENSE criado pelo GitHub), use o comando abaixo antes do push:
> `git pull origin main --rebase`
