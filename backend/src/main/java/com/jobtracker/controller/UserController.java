package com.jobtracker.controller;

import com.jobtracker.dto.ProfileRequest;
import com.jobtracker.model.User;
import com.jobtracker.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class UserController extends BaseController {
    private static final long MAX_RESUME_SIZE = 5L * 1024 * 1024;
    private final Path resumeDirectory;

    public UserController(UserRepository userRepository,
                          @Value("${app.upload.dir:uploads}") String uploadDirectory) {
        super(userRepository);
        this.resumeDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize().resolve("resumes").normalize();
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        User u = currentUser(authentication);
        return Map.of(
                "id", u.getId(),
                "name", u.getName(),
                "email", u.getEmail(),
                "title", u.getTitle() == null ? "" : u.getTitle(),
                "phone", u.getPhone() == null ? "" : u.getPhone(),
                "location", u.getLocation() == null ? "" : u.getLocation(),
                "resume", u.getResume() == null ? "" : u.getResume(),
                "hasResume", u.getResumeStorageKey() != null,
                "bio", u.getBio() == null ? "" : u.getBio()
        );
    }

    @PutMapping("/profile")
    public Map<String, Object> update(@RequestBody ProfileRequest request, Authentication authentication) {
        User u = currentUser(authentication);
        if (request.name() != null && !request.name().isBlank()) u.setName(request.name().trim());
        u.setTitle(request.title());
        u.setPhone(request.phone());
        u.setLocation(request.location());
        u.setBio(request.bio());
        userRepository.save(u);
        return me(authentication);
    }

    @PostMapping(value = "/profile/resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadResume(@RequestPart("file") MultipartFile file,
                                            Authentication authentication) throws IOException {
        if (file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a resume file to upload.");
        }
        if (file.getSize() > MAX_RESUME_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Resume files must be 5 MB or smaller.");
        }

        String originalName = file.getOriginalFilename();
        String fileName = originalName == null ? "" : originalName.replace('\\', '/');
        fileName = Path.of(fileName).getFileName().toString();
        String extension = fileName.contains(".")
                ? fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        if (!extension.matches("pdf|doc|docx")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Resume must be a PDF, DOC, or DOCX file.");
        }
        if (fileName.length() > 255) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Resume filename must be 255 characters or fewer.");
        }

        User user = currentUser(authentication);
        String storageKey = UUID.randomUUID() + "." + extension;
        Files.createDirectories(resumeDirectory);
        Path destination = resolveResumePath(storageKey);
        file.transferTo(destination);

        String previousKey = user.getResumeStorageKey();
        user.setResume(fileName);
        user.setResumeStorageKey(storageKey);
        try {
            userRepository.save(user);
        } catch (RuntimeException e) {
            Files.deleteIfExists(destination);
            throw e;
        }
        deleteStoredResume(previousKey);
        return me(authentication);
    }

    @GetMapping("/profile/resume")
    public ResponseEntity<Resource> downloadResume(Authentication authentication) throws IOException {
        User user = currentUser(authentication);
        if (user.getResumeStorageKey() == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No resume has been uploaded.");
        }
        Path resumePath = resolveResumePath(user.getResumeStorageKey());
        if (!Files.isRegularFile(resumePath)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "The uploaded resume file could not be found.");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(user.getResume()).build().toString())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(Files.size(resumePath))
                .body(new FileSystemResource(resumePath));
    }

    @DeleteMapping("/profile/resume")
    public Map<String, Object> deleteResume(Authentication authentication) throws IOException {
        User user = currentUser(authentication);
        String storageKey = user.getResumeStorageKey();
        user.setResume(null);
        user.setResumeStorageKey(null);
        userRepository.save(user);
        deleteStoredResume(storageKey);
        return me(authentication);
    }

    private Path resolveResumePath(String storageKey) {
        Path path = resumeDirectory.resolve(storageKey).normalize();
        if (!path.getParent().equals(resumeDirectory)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid resume storage key.");
        }
        return path;
    }

    private void deleteStoredResume(String storageKey) throws IOException {
        if (storageKey != null) {
            Files.deleteIfExists(resolveResumePath(storageKey));
        }
    }
}
