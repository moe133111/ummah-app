import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A1628', padding: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#E8E0D4" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#E8E0D4', textAlign: 'center', marginBottom: 8 }}>
            Etwas ist schiefgelaufen
          </Text>
          <Text style={{ fontSize: 14, color: '#8B9BB4', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
          </Text>
          <Pressable
            onPress={this.handleRetry}
            style={{
              backgroundColor: '#B8860B',
              paddingVertical: 14,
              paddingHorizontal: 32,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0A1628' }}>Erneut versuchen</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
