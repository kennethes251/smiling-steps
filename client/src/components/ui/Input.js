import React from 'react';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Typography } from '@mui/material';

const StyledFormControl = styled(FormControl)(({ theme, fullWidth = true }) => ({
  width: fullWidth ? '100%' : 'auto',
  marginBottom: theme.spacing(2),
}));

const StyledLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1),
  '&.Mui-focused': {
    color: theme.palette.primary.main,
  },
  '&.Mui-error': {
    color: theme.palette.error.main,
  },
  '&.Mui-disabled': {
    color: theme.palette.text.disabled,
  },
}));

const StyledInput = styled(OutlinedInput)(({ theme, error, startAdornment }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.2s ease-in-out',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.grey[300],
    borderWidth: '1px',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.grey[400],
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
    borderWidth: '1px',
    boxShadow: `0 0 0 3px ${theme.palette.primary.light}40`,
  },
  '&.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.error.main,
  },
  '&.Mui-disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.action.disabled,
    },
  },
  ...(startAdornment && {
    paddingLeft: '8px',
  }),
}));

const StyledHelperText = styled(FormHelperText)(({ theme, error }) => ({
  margin: '4px 0 0 0',
  color: error ? theme.palette.error.main : theme.palette.text.secondary,
  fontSize: '0.75rem',
  lineHeight: 1.5,
}));

const Input = ({
  label,
  helperText,
  error = false,
  fullWidth = true,
  required = false,
  disabled = false,
  type = 'text',
  startAdornment,
  endAdornment,
  showPasswordToggle = false,
  multiline = false,
  rows = 4,
  size = 'medium',
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  name,
  id,
  inputRef,
  inputProps,
  InputLabelProps,
  FormHelperTextProps,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  const renderEndAdornment = () => {
    if (type === 'password' && showPasswordToggle) {
      return (
        <InputAdornment position="end">
          <IconButton
            aria-label="toggle password visibility"
            onClick={handleClickShowPassword}
            onMouseDown={handleMouseDownPassword}
            edge="end"
            size="small"
            tabIndex={-1}
          >
            {showPassword ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </InputAdornment>
      );
    }
    return endAdornment ? (
      <InputAdornment position="end">{endAdornment}</InputAdornment>
    ) : null;
  };

  const renderStartAdornment = () => {
    return startAdornment ? (
      <InputAdornment position="start">{startAdornment}</InputAdornment>
    ) : null;
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <StyledFormControl 
      fullWidth={fullWidth} 
      variant="outlined"
      error={error}
      disabled={disabled}
      {...props}
    >
      {label && (
        <StyledLabel
          htmlFor={id}
          shrink={isFocused || value || (inputProps && inputProps.value) ? true : undefined}
          {...InputLabelProps}
        >
          {label}
          {required && (
            <Typography 
              component="span" 
              sx={{
                color: error ? 'error.main' : 'text.secondary',
                ml: 0.5,
              }}
            >
              *
            </Typography>
          )}
        </StyledLabel>
      )}
      <StyledInput
        id={id}
        name={name}
        type={inputType}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        fullWidth={fullWidth}
        multiline={multiline}
        rows={multiline ? rows : undefined}
        startAdornment={renderStartAdornment()}
        endAdornment={renderEndAdornment()}
        inputRef={inputRef}
        inputProps={{
          'aria-invalid': error ? 'true' : 'false',
          ...inputProps,
        }}
        size={size}
        startAdornment={!!startAdornment}
      />
      {helperText && (
        <StyledHelperText 
          error={error} 
          id={`${id}-helper-text`}
          {...FormHelperTextProps}
        >
          {helperText}
        </StyledHelperText>
      )}
    </StyledFormControl>
  );
};

export default Input;
