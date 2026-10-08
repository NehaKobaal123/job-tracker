package com.jobtracker.dto;

import java.time.LocalDate;

public record ApplicationRequest(
        String company, String role, String location, String source,
        LocalDate appliedDate, String status, String notes, String jobUrl) {}
