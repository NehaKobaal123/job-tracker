package com.jobtracker.repository;

import com.jobtracker.model.SavedJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SavedJobRepository extends JpaRepository<SavedJob, Long> {
    List<SavedJob> findByUserIdOrderBySavedAtDesc(Long userId);
    Optional<SavedJob> findByIdAndUserId(Long id, Long userId);
}
