# TrackRight - Expense Tracker

TrackRight is a modern, intuitive, and privacy-focused expense tracking application built with Next.js. It allows users to effortlessly record daily expenses, manage recurring subscriptions, and visualize their spending habits through insightful reports. All data is stored locally on the server where the application is run, ensuring users have full control over their financial information without needing to create an account.

![TrackRight Dashboard](https://placehold.co/800x450.png)

## Core Features

-   **Expense Input**: Quickly record daily expenses with amounts, categories, dates, and optional descriptions.
-   **Subscription Management**: Define fixed monthly subscriptions to automatically factor them into financial reports.
-   **Category Management**: Organize spending with customizable categories, each with a unique name and icon.
-   **Multi-Currency Support**: Record expenses in various currencies (USD, EUR, JPY, CHF). The app can convert and display totals in a user-selected default currency.
-   **Data Visualization**: Generate beautiful and informative reports to understand your finances.
    -   **Daily Spending Trends**: A line chart showing spending over a selected period (weekly, monthly, or yearly).
    -   **Category Breakdown**: A pie chart showing the proportion of spending by category.
    -   **Weekday Averages**: A bar chart displaying the average spending for each day of the week, helping identify spending patterns.
-   **Local Data Storage**: All data is stored in a local SQLite database and JSON files on the server, ensuring privacy and user control. No cloud accounts are required.
-   **Responsive Design**: A clean, minimalist interface that works seamlessly on both desktop and mobile devices.

## Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)
-   **Charts**: [Recharts](https://recharts.org/)
-   **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
-   **Database**: [SQLite](https://www.sqlite.org/index.html)
-   **Containerization**: [Docker](https://www.docker.com/)

## Running Locally

You can run TrackRight locally using either `npm` for development or Docker for a portable, production-like environment.

### Using `npm` (for development)

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will start, and you can access it at `http://localhost:9002` in your web browser.

### Using Docker (for portability and production)

This method requires [Docker](https://www.docker.com/get-started) to be installed on your machine.

1.  **Build the Docker Image:**
    In the root directory of the project, run the build command. This will create a container image named `trackright-app`.
    ```bash
    docker build -t trackright-app .
    ```

2.  **Run the Docker Container:**
    Once the image is built, run the container. The `-v` flag is crucial as it maps the local `./data` directory to the container's `/app/data` directory, ensuring your database and settings are persisted even if the container is stopped or removed.
    ```bash
    docker run -p 9002:9002 -v "$(pwd)/data:/app/data" --name trackright-container trackright-app
    ```

3.  **Access the App:**
    The application will be available at `http://localhost:9002`.

## Configuration

### Exchange Rate API Key
For accurate, live currency conversions, the app uses the [ExchangeRate-API](https://www.exchangerate-api.com/). Without a key, the app will use placeholder conversion rates.

-   Sign up for a free API key on their website.
-   Navigate to the **Settings** tab in the TrackRight application.
-   Enter your API key in the "ExchangeRate-API Key" section and click "Save API Key". The key is stored securely on the server.

## Usage

-   **Dashboard**: Get a quick overview of your total spending for the current month, your monthly subscription costs, and a list of your most recent expenses.
-   **Expenses**: View, add, edit, and delete individual expenses. You can search, sort, and filter your expenses to easily find what you're looking for.
-   **Subscriptions**: Manage your recurring monthly subscriptions.
-   **Reports**: Analyze your spending habits with interactive charts for weekly, monthly, or yearly periods.
-   **Settings**:
    -   Manage your expense categories.
    -   Set your default display currency.
    -   Add or update your ExchangeRate-API key.
    -   Permanently delete your data if you wish to start fresh.
