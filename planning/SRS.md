# Software Requirements Specification (SRS)

## Project Information

| Item         | Description             |
| ------------ | ----------------------- |
| Project Name | CBeave                  |
| Repository   | cbeave-auction-platform |
| Version      | 0.1.0                   |
| Author       | Chanon Sawaengphon      |
| Date         | 2026-06-27              |
| Status       | Draft                   |

---

# Chapter 1. Introduction

## 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for **CBeave**, a modern online auction platform. The purpose of this document is to provide a clear understanding of the system requirements before development begins and to serve as a reference throughout the software development lifecycle.

This document is intended for the project developer, project mentor, and future contributors who need to understand the system's objectives, features, and constraints.

---

## 1.2 Project Scope

CBeave is a web-based auction platform that enables users to buy and sell products through an online bidding system.

The platform provides secure user authentication, auction management, real-time bidding, and administrative features. Buyers can browse auctions and place bids, while sellers can create and manage auctions. Administrators can manage users, categories, and monitor system activities.

The project will be developed using the following technology stack:

* Frontend: Next.js (App Router) with TypeScript
* Backend: NestJS with TypeScript
* Database: PostgreSQL
* ORM: Prisma
* Real-time Communication: WebSockets
* Deployment: Docker

---

## 1.3 Objectives

The objectives of this project are:

* Develop a secure online auction platform.
* Provide real-time bidding functionality.
* Build a responsive and user-friendly web application.
* Apply modern full-stack development practices.
* Demonstrate software engineering skills through proper planning, documentation, implementation, testing, and deployment.

---

## 1.4 Intended Audience

This document is intended for:

* Project Developer
* Software Engineering Instructors
* Future Contributors
* Technical Reviewers

---

## 1.5 Technologies

| Category          | Technology   |
| ----------------- | ------------ |
| Frontend          | Next.js      |
| Language          | TypeScript   |
| Backend           | NestJS       |
| Database          | PostgreSQL   |
| ORM               | Prisma       |
| Authentication    | JWT          |
| Real-time         | WebSockets   |
| API Documentation | Swagger      |
| Containerization  | Docker       |
| Version Control   | Git & GitHub |

---

## 1.6 Definitions and Acronyms

| Term      | Description                                                                               |
| --------- | ----------------------------------------------------------------------------------------- |
| API       | Application Programming Interface                                                         |
| JWT       | JSON Web Token                                                                            |
| ORM       | Object-Relational Mapping                                                                 |
| SRS       | Software Requirements Specification                                                       |
| CRUD      | Create, Read, Update, Delete                                                              |
| WebSocket | A protocol enabling real-time bidirectional communication between clients and the server. |

---

## 1.7 References

* IEEE 29148 – Systems and Software Engineering: Requirements Engineering
* NestJS Documentation
* Next.js Documentation
* Prisma Documentation
* PostgreSQL Documentation
* Docker Documentation

# Chapter 2. Overall Description

## 2.1 Product Perspective

CBeave is a standalone web-based auction platform that allows users to create, manage, and participate in online auctions. The system enables buyers to discover products and place bids in real time while allowing sellers to manage their own auctions through a dedicated dashboard.

The platform follows a client-server architecture, where the frontend communicates with the backend through REST APIs and WebSocket connections.

### System Architecture Overview

```text
+----------------------+
|      Next.js         |
| (Frontend Client)    |
+----------+-----------+
           |
      REST API / WebSocket
           |
+----------v-----------+
|       NestJS         |
|   Backend Services   |
+----------+-----------+
           |
        Prisma ORM
           |
+----------v-----------+
|     PostgreSQL       |
|      Database        |
+----------------------+
```

## 2.2 Product Functions

The system provides the following major functions:

* User registration and authentication
* User profile management
* Auction creation and management
* Product image upload
* Browse and search auctions
* Real-time bidding
* Bid history
* Auction countdown timer
* Winner determination
* User notifications
* Category management
* Administrative dashboard
* API documentation using Swagger

---

## 2.3 User Roles

### Guest

A guest user can:

* Browse available auctions
* Search auctions
* View auction details
* Register a new account
* Log in

---

### Buyer

A buyer can:

* Manage personal profile
* Place bids
* View bid history
* Receive auction notifications
* View won auctions

---

### Seller

A seller can:

* Create auctions
* Edit auctions before bidding begins
* Upload product images
* Monitor auction progress
* View auction results

---

### Administrator

An administrator can:

* Manage users
* Manage categories
* Monitor auctions
* View reports
* Suspend inappropriate content

---

## 2.4 Operating Environment

The system will operate in the following environment:

### Client

* Modern web browser
* Desktop and mobile devices
* Internet connection

### Server

* Node.js
* Docker
* PostgreSQL

---

## 2.5 Design and Implementation Constraints

The project is subject to the following constraints:

* Developed by a single developer.
* Development period is approximately one month.
* Backend uses NestJS with TypeScript.
* Frontend uses Next.js (App Router) with TypeScript.
* PostgreSQL is the primary database.
* Prisma is used as the ORM.
* JWT is used for authentication.
* Docker is used for containerization.
* GitHub is used for version control.

---

## 2.6 Assumptions and Dependencies

The project assumes that:

* Users have a stable internet connection.
* Users access the system through a modern web browser.
* Email services are available for account verification and password reset.
* Docker is installed in the deployment environment.
* PostgreSQL is available and properly configured.

---

## 2.7 Features in Scope

The following features are included in Version 1.0:

* User authentication
* User profile
* Auction management
* Product categories
* Image upload
* Real-time bidding
* Bid history
* Winner selection
* Administrative dashboard
* Swagger API documentation
* Docker deployment

---

## 2.8 Features Out of Scope

The following features are not included in Version 1.0:

* Online payment gateway
* Live chat between users
* Native Android application
* Native iOS application
* Progressive Web App (PWA)
* AI product recommendations
* Multi-language support
* Social media login
* Product shipping management
* Multi-vendor storefront
* Advanced analytics dashboard
