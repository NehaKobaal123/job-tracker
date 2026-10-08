package com.jobtracker.dto;

import java.time.LocalDateTime;

public record InterviewRequest(
        String company, String role, LocalDateTime interviewDate,
        String type, String status, String notes) {}
