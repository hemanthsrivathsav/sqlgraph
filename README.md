# sqlgraph

npm create vite@latest sql-graph
cd sql-graph
npm install tailwindcss @tailwindcss/vite

# add in vite.config.ts
import tailwindcss from '@tailwindcss/vite'
# add in plugins list in vite.config.ts
tailwindcss(),

# add this in index.css
@import "tailwindcss";

# add this in html file 
<link href="/src/style.css" rel="stylesheet">

# install this before running 
npm install react-zoom-pan-pinch

# running 
npm run dev 



# backend running 
pip install fastapi uvicorn
cd <backend folder>
python -m uvicorn backend.main:app --reload --port 8000

