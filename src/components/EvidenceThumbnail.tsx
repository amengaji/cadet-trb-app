// src/components/EvidenceThumbnail.tsx
import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

interface EvidenceThumbnailProps {
  uri?: string;
  caption?: string;
  onPress?: () => void;
}

/**
 * EvidenceThumbnail
 *
 * Shows a small preview of photo evidence.
 */
const EvidenceThumbnail: React.FC<EvidenceThumbnailProps> = ({
  uri,
  caption,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imageWrapper}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </View>
      {!!caption && <Text style={styles.caption}>{caption}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    marginRight: 12,
  },
  imageWrapper: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 80,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  placeholderText: {
    fontSize: 12,
    color: "#6B7280",
  },
  caption: {
    marginTop: 4,
    fontSize: 11,
    color: "#374151",
  },
});

export default EvidenceThumbnail;
