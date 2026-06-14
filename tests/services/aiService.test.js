const aiService = require('../../src/services/aiService');
const axios = require('axios');

jest.mock('axios', () => {
  const mAxiosInstance = { get: jest.fn(), post: jest.fn() };
  return {
    post: jest.fn(),
    create: jest.fn(() => mAxiosInstance)
  };
});

describe('AI Service', () => {
  let interviewApiClient;
  
  beforeAll(() => {
    // The module is required, which triggers axios.create
    // Let's grab the mocked instance
    interviewApiClient = axios.create();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getJobRecommendations', () => {
    it('should successfully fetch job recommendations', async () => {
      axios.post.mockResolvedValue({
        data: { success: true, total: 1, recommendations: [{ id: 1 }] }
      });
      
      const result = await aiService.getJobRecommendations({ skills: ['JS'] });
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should throw an error if the AI API fails', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));
      await expect(aiService.getJobRecommendations({})).rejects.toThrow('Failed to fetch job recommendations');
    });
  });

  describe('parseCV', () => {
    it('should post buffer to upload-cv', async () => {
      axios.post.mockResolvedValue({ data: { skills: ['Node'] } });
      
      const result = await aiService.parseCV(Buffer.from('test'), 'test.pdf');
      expect(result).toEqual({ skills: ['Node'] });
      expect(axios.post).toHaveBeenCalled();
    });

    it('should throw an error on failure', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));
      await expect(aiService.parseCV(Buffer.from(''), 'f.pdf')).rejects.toThrow('Failed to parse CV');
    });
  });

  describe('Interview Methods', () => {
    it('getAIJobs should fetch jobs successfully', async () => {
      interviewApiClient.get.mockResolvedValue({ data: [{ id: 1, revup_id: 10 }] });
      const result = await aiService.getAIJobs();
      expect(result).toEqual([{ id: 1, revup_id: 10 }]);
    });

    it('findAIJobId should return matching ID', async () => {
      interviewApiClient.get.mockResolvedValue({ data: [{ id: 1, revup_id: 10 }] });
      const result = await aiService.findAIJobId(10);
      expect(result).toBe(1);
    });

    it('findAIJobId should return null if no match', async () => {
      interviewApiClient.get.mockResolvedValue({ data: [{ id: 1, revup_id: 10 }] });
      const result = await aiService.findAIJobId(99);
      expect(result).toBeNull();
    });

    it('startAIInterview should call API correctly', async () => {
      interviewApiClient.post.mockResolvedValue({ data: { interview_id: 5 } });
      const result = await aiService.startAIInterview(1, 'Name', 'email@test.com');
      expect(result.interview_id).toBe(5);
    });

    it('getNextAIQuestion should fetch correctly', async () => {
      interviewApiClient.get.mockResolvedValue({ data: { id: 1, content: 'Test Q' } });
      const result = await aiService.getNextAIQuestion(5);
      expect(result.content).toBe('Test Q');
    });

    it('submitAIAnswer should return evaluation', async () => {
      interviewApiClient.post.mockResolvedValue({ data: { is_complete: true } });
      const result = await aiService.submitAIAnswer(5, { question_id: 1, answer: 'Hi' });
      expect(result.is_complete).toBe(true);
    });

    it('getAIReport should return report data', async () => {
      interviewApiClient.get.mockResolvedValue({ data: { overall_score: 90 } });
      const result = await aiService.getAIReport(5);
      expect(result.overall_score).toBe(90);
    });

    it('streamAIQuestion should return response data as stream', async () => {
      interviewApiClient.get.mockResolvedValue({ data: 'mock_stream_buffer' });
      const result = await aiService.streamAIQuestion(5, 1);
      expect(result).toBe('mock_stream_buffer');
    });
    
    it('trackAICheatEvent should post event data', async () => {
      interviewApiClient.post.mockResolvedValue({});
      await aiService.trackAICheatEvent(5, { event_type: 'tab_switch' });
      expect(interviewApiClient.post).toHaveBeenCalledWith('/api/v1/interviews/5/track', { event_type: 'tab_switch' });
    });
  });
});
