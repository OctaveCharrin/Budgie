# Budgie - Data Storage and Schema Documentation

This document provides a detailed technical overview of how Budgie stores its data. It is intended for developers or data specialists who wish to interact with the application's data directly for analysis, backups, or building custom tools.

## 1. Storage Location

All persistent data for the Budgie application is stored within the `/data` directory, which is created at the root of the project during the first run. This includes the main database and all configuration files.

-   **Path:** `./data/`

This design ensures data portability and makes backups as simple as copying a single directory. When running via Docker, this directory should be mounted as a volume to persist data across container restarts.

---

## 2. JSON Configuration Files

Several key aspects of the application's configuration are stored in human-readable JSON files within the `/data` directory.

### a. `settings.json`

This file stores global user preferences and application settings.

-   **Path:** `data/settings.json`
-   **Purpose:** Configures the core behavior and appearance of the application.

**Schema:**

```json
{
  "defaultCurrency": "USD",
  "apiKey": "YOUR_API_KEY_HERE",
  "monthlyBudget": 1500.00
}
```

-   `defaultCurrency` (string, required): The ISO 4217 currency code (e.g., 'USD', 'EUR') used for displaying aggregated totals and reports. Must be one of the supported currencies.
-   `apiKey` (string, optional): The API key for `exchangerate-api.com`. If empty or missing, currency conversion will use hardcoded fallback rates.
-   `monthlyBudget` (number, optional): The user-defined monthly spending budget. Used in the Dashboard and Reports for tracking. Defaults to `0` if not set.

### b. `categories.json`

This file contains the list of user-defined and default expense categories.

-   **Path:** `data/categories.json`
-   **Purpose:** Manages the categories available for tagging expenses and subscriptions.

**Schema (Array of Objects):**

```json
[
  {
    "id": "restaurant",
    "name": "Restaurant",
    "icon": "UtensilsCrossed",
    "isDefault": true
  },
  {
    "id": "a1b2c3d4-e5f6-...",
    "name": "Custom Category",
    "icon": "DollarSign",
    "isDefault": false
  }
]
```

-   `id` (string, required): A unique identifier for the category. Default categories have human-readable IDs, while user-created categories have a UUID.
-   `name` (string, required): The display name of the category.
-   `icon` (string, required): The name of a `lucide-react` icon to display for the category.
-   `isDefault` (boolean, optional): If `true`, the category is a default one and cannot be deleted from the UI.

### c. `rates.json`

This file caches the currency conversion rates fetched from the API.

-   **Path:** `data/rates.json`
-   **Purpose:** To store exchange rates to minimize API calls and allow for offline currency conversion.

**Schema:**

```json
{
  "lastFetched": "2023-10-28T10:00:00.000Z",
  "rates": {
    "USD": {
      "USD": 1,
      "EUR": 0.93,
      "JPY": 157.50,
      "CHF": 0.90
    },
    "EUR": {
      "USD": 1.08,
      "EUR": 1,
      "JPY": 169.80,
      "CHF": 0.97
    }
  }
}
```

-   `lastFetched` (string | null): An ISO 8601 timestamp indicating when the rates were last successfully updated.
-   `rates` (object): An object where each key is a supported currency code (the "base" currency). The value is another object containing the conversion rates from that base currency to all other supported currencies.

---

## 3. SQLite Database (`budgie.db`)

The core financial data (expenses and subscriptions) is stored in a SQLite database file. This provides robustness, scalability, and the ability to perform efficient queries.

-   **Path:** `data/budgie.db`

### Connecting with Python

You can easily connect to this database using Python's built-in `sqlite3` library or other packages like `pandas`.

```python
import sqlite3
import pandas as pd

# Path to the database file
db_path = 'data/budgie.db'

# Connect to the database
conn = sqlite3.connect(db_path)

# Example: Read all expenses into a pandas DataFrame
expenses_df = pd.read_sql_query("SELECT * FROM expenses", conn)
print(expenses_df.head())

# Close the connection
conn.close()
```

### Table Schemas

#### a. `expenses` Table

This table stores every individual expense record.

| Column Name        | Type    | Description                                                                                                                                              |
| ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | `TEXT`  | **Primary Key.** A unique UUID (e.g., `'a1b2c3d4-...'`) identifying the expense.                                                                          |
| `date`             | `TEXT`  | The date the expense occurred, stored as a string in **'YYYY-MM-DD'** format.                                                                              |
| `categoryId`       | `TEXT`  | The `id` of the category this expense belongs to. This links to an entry in `categories.json`. It is **not** a formal foreign key.                         |
| `originalAmount`   | `REAL`  | The amount of the expense in its original currency.                                                                                                        |
| `originalCurrency` | `TEXT`  | The ISO 4217 code of the original currency (e.g., 'USD').                                                                                                  |
| `day_of_week`      | `INTEGER`| The day of the week the expense occurred, where **Monday is 0** and **Sunday is 6**. Pre-calculated for efficient reporting.                               |
| `amount_usd`       | `REAL`  | The expense amount converted to USD. This column (and others like it) is pre-calculated on insert/update for fast, multi-currency reporting.               |
| `amount_eur`       | `REAL`  | The expense amount converted to EUR.                                                                                                                       |
| `amount_jpy`       | `REAL`  | The expense amount converted to JPY.                                                                                                                       |
| `amount_chf`       | `REAL`  | The expense amount converted to CHF.                                                                                                                       |
| `description`      | `TEXT`  | An optional, user-provided description for the expense. Can be `NULL`.                                                                                     |

#### b. `subscriptions` Table

This table stores recurring monthly subscriptions.

| Column Name        | Type    | Description                                                                                                                                                |
| ------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | `TEXT`  | **Primary Key.** A unique UUID identifying the subscription.                                                                                                 |
| `name`             | `TEXT`  | The name of the subscription (e.g., 'Netflix').                                                                                                              |
| `categoryId`       | `TEXT`  | The `id` of the category this subscription belongs to, linking to `categories.json`. Typically, this will be the ID for the 'Subscriptions' category.          |
| `originalAmount`   | `REAL`  | The monthly cost of the subscription in its original currency.                                                                                               |
| `originalCurrency` | `TEXT`  | The ISO 4217 code of the original currency.                                                                                                                  |
| `startDate`        | `TEXT`  | The date the subscription began, stored as a string in **'YYYY-MM-DD'** format.                                                                               |
| `endDate`          | `TEXT`  | The date the subscription ends, stored as 'YYYY-MM-DD'. Can be `NULL` if the subscription is ongoing.                                                         |
| `amount_usd`       | `REAL`  | The monthly cost converted to USD.                                                                                                                           |
| `amount_eur`       | `REAL`  | The monthly cost converted to EUR.                                                                                                                           |
| `amount_jpy`       | `REAL`  | The monthly cost converted to JPY.                                                                                                                           |
| `amount_chf`       | `REAL`  | The monthly cost converted to CHF.                                                                                                                           |
| `description`      | `TEXT`  | An optional, user-provided description. Can be `NULL`.                                                                                                       |
