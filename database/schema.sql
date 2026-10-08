CREATE DATABASE IF NOT EXISTS jobtracker;
USE jobtracker;

-- Spring Boot JPA will create/update the tables automatically during local development.
-- This file is included so you can see the intended database structure.

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  phone VARCHAR(255),
  location VARCHAR(255),
  resume VARCHAR(255),
  resume_storage_key VARCHAR(255),
  bio VARCHAR(2000)
);

CREATE TABLE IF NOT EXISTS applications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  company VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  source VARCHAR(255),
  applied_date DATE,
  status VARCHAR(100) NOT NULL,
  notes VARCHAR(255),
  job_url VARCHAR(1000),
  CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  company VARCHAR(255),
  role VARCHAR(255),
  interview_date DATETIME,
  type VARCHAR(100),
  status VARCHAR(100),
  notes VARCHAR(255),
  CONSTRAINT fk_interview_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  company VARCHAR(255),
  role VARCHAR(255),
  location VARCHAR(255),
  job_url VARCHAR(1000),
  saved_at DATETIME,
  CONSTRAINT fk_saved_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
