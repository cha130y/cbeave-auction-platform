# Software Requirements Specification (SRS)

## Project Information

| Item         | Description             |
| ------------ | ----------------------- |
| Project Name | CBeave                  |
| Repository   | cbeave-auction-platform |
| Version      | 0.1.0                   |
| Author       | *Your Name*             |
| Date         | *YYYY-MM-DD*            |
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
* Project Mentor
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
