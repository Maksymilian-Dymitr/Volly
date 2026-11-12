-- Demo seed for interviews/portfolio. Runs after migrations on a fresh DB.
-- All demo accounts share the password: VollyDemo2026
INSERT INTO users (email, password, first_name, last_name, bio, onboarding_completed) VALUES
  ('demo.anna@volly.se', '$2b$10$FX1iLaczuBrdyOUX1W4jCOxZmIQKPy2YZshPh3PtDyV.HsLMiuBQ.', 'Anna', 'Lind', 'Utvecklare som gärna hjälper till med teknik och CV.', TRUE),
  ('demo.erik@volly.se', '$2b$10$FX1iLaczuBrdyOUX1W4jCOxZmIQKPy2YZshPh3PtDyV.HsLMiuBQ.', 'Erik', 'Berg', 'Pluggar svenska och lär mig programmera.', TRUE),
  ('demo.sara@volly.se', '$2b$10$FX1iLaczuBrdyOUX1W4jCOxZmIQKPy2YZshPh3PtDyV.HsLMiuBQ.', 'Sara', 'Holm', 'Pensionerad lärare, hjälper gärna med språk.', TRUE);

INSERT INTO post (user_id, title, description, help_type, category, tagg, created_at) VALUES
  (1, 'Hjälp med CV och LinkedIn', 'Jag kan gå igenom ditt CV och ge tips inför intervjuer inom IT.', 'giveHelp', 'Karriär', 'cv', NOW() - INTERVAL '2 days'),
  (2, 'Någon som kan förklara React hooks?', 'Jag fastnar på useEffect och vill gärna ha en videosamtal-genomgång.', 'getHelp', 'Teknik', 'react', NOW() - INTERVAL '1 day'),
  (3, 'Språkcafé på distans', 'Öva svenska i lugnt tempo, alla nivåer välkomna.', 'giveHelp', 'Språk', 'svenska', NOW() - INTERVAL '5 hours'),
  (2, 'Hjälp att fylla i blankett från Försäkringskassan', 'Förstår inte alla fält, någon som har koll?', 'getHelp', 'Administration', '', NOW() - INTERVAL '2 hours');

-- Anna (1) contacted Erik's React post (2): accepted, ready for chat + video.
INSERT INTO request (post_id, creator_id, status, created_at) VALUES
  (2, 1, 'accepted', NOW() - INTERVAL '20 hours'),
  (3, 2, 'pending', NOW() - INTERVAL '1 hour');

INSERT INTO messages (request_id, sender_id, text_message, created_at) VALUES
  (1, 1, 'Hej Erik! Jag kan hjälpa dig med hooks.', NOW() - INTERVAL '19 hours'),
  (1, 2, 'Toppen! Kan vi ta ett videosamtal?', NOW() - INTERVAL '18 hours');
