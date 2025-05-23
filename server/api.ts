// Discussion replies endpoints
app.get("/api/discussion-replies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const reply = await storage.getDiscussionReply(Number(id));
    if (!reply) {
      return res.status(404).json({ message: "Discussion reply not found" });
    }
    res.json(reply);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Discussion comments endpoints
app.post("/api/discussion-comments", authenticateUser, async (req, res) => {
  try {
    // Validate the user is the same as the authorId in the body
    if (req.user.id !== req.body.authorId) {
      return res.status(403).json({ message: "Unauthorized: User ID mismatch" });
    }

    const comment = await storage.createDiscussionComment(req.body);
    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/discussion-comments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await storage.getDiscussionComment(Number(id));
    if (!comment) {
      return res.status(404).json({ message: "Discussion comment not found" });
    }
    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/discussion-comments/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await storage.getDiscussionComment(Number(id));
    
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    
    // Only allow the author to delete their comment
    if (comment.authorId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: Not the comment author" });
    }
    
    await storage.deleteDiscussionComment(Number(id));
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}); 