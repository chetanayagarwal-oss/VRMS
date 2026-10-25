# SwipeGig Production & Testnet Deployment Guide

Comprehensive deployment guide for deploying SwipeGig's three primary tiers:
1. **Smart Contracts**: Sepolia Testnet deployment via Foundry.
2. **Backend**: FastAPI deployment on Render, Railway, or Fly.io.
3. **Frontend**: Vite + React SPA deployment on Vercel or Netlify.

---

## 1. Smart Contract Deployment (Sepolia Testnet)

The Solidity contracts (`GigEscrow.sol` and `ReputationSBT.sol`) are deployed using Foundry.

### Prerequisites
- [Foundry (`forge`, `cast`)](https://book.getfoundry.sh/getting-started/installation) installed.
- A funded Sepolia wallet (get Sepolia ETH from faucets such as Google Cloud Web3 or Alchemy).
- An RPC URL (e.g., Alchemy or Infura).
- An Etherscan API key (for automatic contract source verification).

### Step-by-Step
1. Navigate to the contracts directory:
   ```bash
   cd contracts
   ```

2. Copy the example environment file and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
   Configure `.env`:
   ```env
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
   PRIVATE_KEY=your_private_key_without_0x
   ETHERSCAN_API_KEY=your_etherscan_key
   ```

3. Run Foundry tests to ensure all checks pass:
   ```bash
   forge test -vvv
   ```

4. Execute the deployment script onto Sepolia:
   ```bash
   forge script script/Deploy.s.sol:DeployScript \
     --rpc-url $SEPOLIA_RPC_URL \
     --broadcast \
     --verify \
     -vvvv
   ```

5. Record the deployed addresses output in your terminal:
   - `ReputationSBT deployed at: 0x...`
   - `GigEscrow deployed at:    0x...`

---

## 2. Backend Deployment (FastAPI on Render / Railway / Fly.io)

### Option A: Render (Recommended for FastAPI)
1. Push your repository to GitHub / GitLab.
2. In the Render Dashboard, select **New +** -> **Web Service**.
3. Connect your repository and configure:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. In the **Environment Variables** tab, add:
   ```env
   JWT_SECRET=your-random-32-character-secret-key
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=15
   REFRESH_TOKEN_EXPIRE_DAYS=7
   CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173
   OPENAI_API_KEY=sk-proj-...
   LLM_PROVIDER=openai
   LLM_MODEL=gpt-4o-mini
   MAX_ROUNDS=6
   ```
5. Click **Create Web Service**. Note your public service URL (e.g. `https://swipegig-api.onrender.com`).

### Option B: Railway
1. Click **New Project** -> **Deploy from GitHub repo**.
2. Set root directory to `/backend`.
3. Add the environment variables listed above.
4. Railway will automatically detect the Python virtual environment and expose the port.

---

## 3. Frontend Deployment (Vercel / Netlify)

### Option A: Vercel (Recommended for Vite + React)
1. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Select your repository.
3. Configure the build settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (workspace root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the **Environment Variables**:
   ```env
   VITE_API_URL=https://swipegig-api.onrender.com
   VITE_ESCROW_CONTRACT_ADDRESS=0xYourSepoliaEscrowAddress
   VITE_SBT_CONTRACT_ADDRESS=0xYourSepoliaSBTAddress
   VITE_ANALYTICS_ENABLED=true
   ```
5. Click **Deploy**.

### Option B: Netlify
1. Click **Add new site** -> **Import an existing project**.
2. Select GitHub repo, set Build command to `npm run build` and publish directory to `dist`.
3. Add environment variables under **Site Settings** -> **Environment Variables**.
4. Add a `_redirects` file in `public/` or `dist/` with `/* /index.html 200` to support client-side SPA routing.

---

## 4. Environment Variables Reference

### Frontend (`.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of deployed FastAPI backend | `https://api.swipegig.io` |
| `VITE_ESCROW_CONTRACT_ADDRESS` | Deployed `GigEscrow` address on Sepolia | `0x1234...` |
| `VITE_SBT_CONTRACT_ADDRESS` | Deployed `ReputationSBT` address on Sepolia | `0x5678...` |
| `VITE_ANALYTICS_ENABLED` | Enable client-side event tracking | `true` or `false` |

### Backend (`backend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `JWT_SECRET` | 32+ character signing secret | `secret-hex-key` |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan | `7` |
| `CORS_ORIGINS` | Comma-delimited allowed origins (no `*`) | `https://swipegig.vercel.app` |
| `OPENAI_API_KEY` | OpenAI API key for agent negotiation | `sk-...` |

### Contracts (`contracts/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `SEPOLIA_RPC_URL` | JSON-RPC provider endpoint | `https://eth-sepolia.g.alchemy.com/v2/...` |
| `PRIVATE_KEY` | Deployer private key | `abc123...` |
| `ETHERSCAN_API_KEY` | Etherscan verification key | `XYZ123...` |

---

## 5. Post-Deployment Smoke Test Checklist

Execute these checks after full deployment to confirm end-to-end functionality:

- [ ] **Health Endpoint**: `curl https://<backend-url>/health` returns `{"status":"ok","gigs_loaded":...}` with HTTP 200.
- [ ] **CORS Verification**: Sending an `OPTIONS` request from the frontend domain succeeds; requests from unlisted domains fail.
- [ ] **Gig Feed**: Visiting the frontend loads the gig feed cards without showing "Backend Unreachable".
- [ ] **Authentication**: Registering a test account (`POST /auth/register`) returns `access_token` and `refresh_token`.
- [ ] **Protected Endpoint**: `POST /negotiations` without an `Authorization` header returns HTTP 401.
- [ ] **Rate Limiting**: Sending more than 5 login attempts rapidly returns HTTP 429 with a valid `Retry-After` header.
- [ ] **AI Negotiation**: Swiping right initiates the multi-agent negotiation, streams offers via SSE, and reaches agreement.
- [ ] **Smart Contract**: Simulated/testnet transaction updates state to "Locked in Escrow" and allows completion approval.
- [ ] **Modal Resilience**: Pressing `ESC` or clicking `✕` cleanly closes the negotiation modal at any point without locking UI.
- [ ] **Mobile Layout**: Emulating an iPhone SE (375px) displays cards cleanly with no horizontal scroll and minimum 44px button touch targets.
