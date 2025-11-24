import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Survey {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  region_level: string;
  region_name: string;
  created_at: string;
  is_active: boolean;
}

interface SurveyContextType {
  selectedSurvey: Survey | null;
  selectedSurveyId: string | null;
  setSelectedSurvey: (survey: Survey | null) => Promise<void>;
  loadSelectedSurvey: () => Promise<void>;
  clearSelectedSurvey: () => Promise<void>;
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

export const SurveyProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSurvey, setSelectedSurveyState] = useState<Survey | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);

  useEffect(() => {
    loadSelectedSurvey();
  }, []);

  const loadSelectedSurvey = async () => {
    try {
      const surveyId = await AsyncStorage.getItem('selected_survey');
      const surveyData = await AsyncStorage.getItem('selected_survey_data');
      
      if (surveyId) {
        setSelectedSurveyId(surveyId);
      }
      
      if (surveyData) {
        setSelectedSurveyState(JSON.parse(surveyData));
      }
    } catch (error) {
      console.error('Error loading selected survey:', error);
    }
  };

  const setSelectedSurvey = async (survey: Survey | null) => {
    try {
      if (survey) {
        await AsyncStorage.setItem('selected_survey', survey.id);
        await AsyncStorage.setItem('selected_survey_data', JSON.stringify(survey));
        setSelectedSurveyState(survey);
        setSelectedSurveyId(survey.id);
      } else {
        await clearSelectedSurvey();
      }
    } catch (error) {
      console.error('Error setting selected survey:', error);
    }
  };

  const clearSelectedSurvey = async () => {
    try {
      await AsyncStorage.removeItem('selected_survey');
      await AsyncStorage.removeItem('selected_survey_data');
      setSelectedSurveyState(null);
      setSelectedSurveyId(null);
    } catch (error) {
      console.error('Error clearing selected survey:', error);
    }
  };

  return (
    <SurveyContext.Provider
      value={{
        selectedSurvey,
        selectedSurveyId,
        setSelectedSurvey,
        loadSelectedSurvey,
        clearSelectedSurvey,
      }}
    >
      {children}
    </SurveyContext.Provider>
  );
};

export const useSurvey = () => {
  const context = useContext(SurveyContext);
  if (context === undefined) {
    throw new Error('useSurvey must be used within a SurveyProvider');
  }
  return context;
};
