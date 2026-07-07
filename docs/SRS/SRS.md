# CBeave - Online Auction Platform
## Software Requirements Specification (SRS)

## 1. Statement of Problems
* Traditional buying and selling methods often require buyers and sellers to meet physically or rely on fixed-price transactions.
* Existing online auction platforms may lack real-time interaction, have complex user experiences, or do not adequately support small-scale sellers.
* There is a need for a web-based auction platform that enables users to create auctions, participate in real-time bidding, and manage auction activities efficiently through a secure and user-friendly system.

## 2. Purpose
The purpose of CBeave is to provide a secure online auction platform that allows users to buy and sell products through competitive bidding. 

The system aims to:
* Provide a simple, intuitive, and immersive real-time auction experience.
* Enable authenticated users to create and manage auctions.
* Allow authenticated users to participate in real-time bidding.
* Automatically determine auction winners based on the highest valid bid.
* Provide administrators with tools to manage users, categories, and auctions.
* Ensure secure authentication and authorization for all users.

## 3. Scope
CBeave is a responsive web application accessible through modern web browsers on desktop, tablet, and mobile devices. 

The system supports three primary user roles:
1. **Guest**
2. **User**
3. **Administrator**

### 3.1 Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js (App Router) + TypeScript |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Real-time Communication | WebSockets |
| Deployment | Docker |

### 3.2 Feature Releases

#### Version 1.0 (Current Version)
* Social media login
* User authentication
* User profile management
* Auction management
* Product category management
* Image upload
* WebSocket communication
* Real-time bidding
* Auction monitoring
* Bid history
* Administrative management
* RESTful API
* Live Arena Experience
* Docker deployment

#### Excluded from Version 1.0
* Online payment processing
* Shipping management
* Native mobile applications
* Progressive Web App (PWA)

---

## 4. Core Functions

### 4.1 Overall System Workflow & Roadmap

```
Guest ──> Browse Auctions
  │
  └───> Register Account ──> Login Successfully ──> Authenticated User
                                                          │
    ┌─────────────────────────────────────────────────────┼────────────────────────────────────────┐
    ▼                                                     ▼                                        ▼
Manage Profile                                     Browse Auctions                               Create Auction
                                                          │                                        │
                                                   Search / Filter                                 Upload Images
                                                          │                                        │
                                                 View Auction Details                      Auction Published
                                                          │                                        │
                                                      Place Bid                            Auction Schedule
                                                          │                                        │
                                                Real-time Bid Updates <─────────────────────── Start Time Reached
                                                          │
                                                     Auction Ends
                                                          │
                                                    Winner Determined
                                                          │
                                                   Notify Participants

Administrator
    │
    ├─> Manage Users
    ├─> Manage Categories
    ├─> Manage Auctions
    └─> View Dashboard
```

#### Release Roadmap
* **Version 1.0 (Current)**
  - [x] Social media login
  - [x] User Authentication
  - [x] Auction Management
  - [x] Real-time Bidding
  - [x] Admin Dashboard
  - [x] Swagger API
  - [x] Docker Deployment
  - [x] Immersive Live Auction Experience
* **Version 1.1**
  - [ ] Watchlist
  - [ ] Auction reports
* **Version 2.0**
  - [ ] Email Notifications
  - [ ] Shipping Management
  - [ ] Payment Gateway
  - [ ] Guest read-only live auction room
  - [ ] Redis caching
* **Version 3.0**
  - [ ] Progressive Web App (PWA)
  - [ ] Native Android App
  - [ ] Native iOS App
  - [ ] Multi-vendor Storefront
  - [ ] Analytic system

---

### 4.2 Role Permission

| Feature | Guest | User | Admin |
| :--- | :---: | :---: | :---: |
| Browse auctions | ☑ | ☑ | ☑ |
| View auction details | ☑ | ☑ | ☑ |
| Search / Filter auctions | ☑ | ☑ | ☑ |
| Register account / Login | | X | X |
| Logout | X | | ☑ |
| View personal dashboard & profile | X | | |
| Create / Update / Delete own auction | X | ☑ | |
| View owned auctions | X | | |
| View bidding history | X | | |
| Update profile | X | ☑ | ☑ |
| Change password | X | ☑ | |
| Upload product images | X | | ☑ |
| Place bid | X | | X |
| Receive in-app notifications | X | | ☑ |
| View administration dashboard & system statistics | X | X | |
| Manage users & categories | | X | ☑ |
| Moderate auctions | | ☑ | ☑ |
| Suspend users | | ☑ | ☑ |

---

### 4.3 Authentication Module
* **User Registration:** Allows new users to create an account using Full name, Email, Password, and Display name.
  * *Business Rules:* Email addresses must be unique in the system. Passwords must be securely hashed before storage. All required fields must pass validation.
* **User Login:** Allows registered users to authenticate using Email / Password or 3rd party login (Google, Facebook). After successful authentication, a JWT Access Token is generated, and user role information is returned to grant access to protected resources.
* **User Logout:** Allows authenticated users to end their current session.
* **User Profile:** Authenticated users can view profile information, update personal information, change password, and upload or change a profile image (optional).

### 4.4 Auction Management
* **Create Auction:** A user can create a new auction by providing the Product title, Description, Category, Starting price, Bid increment (optional), Auction start time, Auction end time, and Product images.
  * *Validation:* End time must be later than start time. Starting price must be greater than zero. At least one product image is required to change the auction status from Draft to Scheduled or Active.
* **Read Auctions:** Users can browse active auctions, view auction details, search by keyword, filter by category/price range/status, and sort by ending soon, newest, highest bid, or lowest starting price.
* **Update Auction:** The owner may edit their auction (Title, Description, Images, Category, Schedule, and Starting price) only before the auction begins. Once bids have been placed, the information cannot be modified.
* **Delete Auction:** The owner may delete an auction only when the auction has not started or no bids have been placed. Deleted auctions are removed from public listings.

### 4.5 Bidding Module
* **Place Bid:** Authenticated users can submit bids on active auctions.
  * *Rules:* The bid must exceed the current highest bid, and users cannot bid on their own auction.
* **Real-time Bid Updates:** Whenever a new bid is accepted, the highest bid is updated immediately and broadcast to other connected users through WebSockets, refreshing the page data without requiring a manual reload.
* **Anti-sniping Rule:** If a bid is placed within the final 2 minutes before the auction closes, the auction end time is automatically extended by an additional 2 minutes (up to a maximum of 5 extensions).
* **Bid History:** Users can view the bid amount, bid time, and bidder details (subject to privacy rules).

### 4.6 Auction Completion & Status

#### Auction Completion
When the auction end time is reached, bidding closes automatically. The highest valid bidder is declared the winner, and the status changes to `"Completed"`. If nobody placed a bid, the status changes to `"Expired"`.

#### Auction Status Definitions
* **Draft:** Information is being prepared; visible only to the owner.
* **Scheduled:** The auction is ready and waiting for the start time; visible to everyone, but bidding is not yet allowed.
* **Active:** The auction has started; users can place bids.
* **Completed:** The auction has ended, and the winner has been determined.
* **Expired:** The auction has ended with no bids placed.
* **Cancelled:** The auction is cancelled before it starts; no bidding allowed.
* **Cancelled (admin):** The auction is cancelled by the Administrator due to inappropriate content.

### 4.7 Management Modules
* **Category Management:** Administrators can create, view, update, and delete unused categories. Regular users can view available categories when searching or creating auctions.
* **User Management:** Administrators can view user profiles, manage accounts, suspend or reactivate accounts, and reset user passwords if required. Regular users do not have permission to delete other users.
* **Product Image Management:** Users can upload, replace, or delete product images. The system validates supported file types, maximum file size, and the maximum number of allowed images.

### 4.8 Administration
* Administrators can monitor system activities, manage users and categories, view auction statistics, review reported auctions, and suspend inappropriate auctions.
* **Important Restriction:** Administrative accounts are strictly restricted from participating in bidding. Platform staff must utilize standard, unprivileged User accounts for personal transactions.

### 4.9 Notification
In Version 1.0, all notifications are strictly real-time, in-app alerts powered by WebSockets.
* The system notifies users when: they are outbid, they win an auction, or their own auction ends.

### 4.10 Live Arena Experience
* **Objective:** To enhance the real-time auction experience through highly engaging visual interactions without modifying the underlying core auction business rules.
* **Live Arena Features:**
  * **Pre-Auction Lobby:** Features a live participant counter, RSVP/Join buttons, a countdown timer, and automatic transition to the Active state.
  * **Live Leaderboard:** Features "King of the Hill" (highest bidder) tracking, leader animations, a bid streak indicator, and masked usernames for privacy.
  * **Sudden Death Arena:** Activated during anti-sniping extensions; features a dynamic UI theme, round indicators, and emphasized countdown graphics.
  * **Victory Podium:** Displays the top three bidders, a winner celebration with confetti animations, and runner-up item suggestions.

*(Technical Note: The Live Arena consumes existing WebSocket events: `auction:started`, `auction:bid`, `auction:extension`, and `auction:ended`).*

### 4.11 Security
The system is designed with the following security measures:
* Authenticate users using JWT.
* Authorize user actions based on assigned roles.
* Securely hash passwords before storing them in the database.
* Validate all incoming user input.
* Restrict access to critical protected system resources.
