import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export async function shareAsImage(viewRef) {
  try {
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Teilen',
      });
    }
  } catch (error) {
    console.error('Share error:', error);
  }
}
